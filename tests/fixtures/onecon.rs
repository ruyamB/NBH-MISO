use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("Vau1t111111111111111111111111111111111111");

// ---------------------------------------------------------------------------
// SECURITY NOTES (read before deploying)
//
// 1. All state-changing accounts are validated via Anchor `#[account(...)]`
//    constraints, not by hand-rolled `if` checks — constraints are checked
//    before your handler body runs, closing the gap where a check is
//    accidentally skipped.
// 2. The vault's token authority is a Program Derived Address (PDA), so no
//    private key exists for it. Only this program can move vault funds, and
//    only via the seeds constraint enforced below.
// 3. Every arithmetic operation on balances uses `checked_*` — overflow or
//    underflow aborts the transaction instead of wrapping silently.
// 4. `has_one` / `constraint` checks tie the depositor's and withdrawer's
//    token accounts to the correct mint and to the signer, preventing a
//    malicious client from substituting an unrelated token account.
// 5. `withdraw` requires the vault owner's signature — there is no
//    "withdraw on behalf of" path, so this contract has no reentrancy or
//    delegated-authority surface to exploit.
// 6. Rent-exemption is enforced implicitly by Anchor's `init` (accounts are
//    created rent-exempt); the vault account cannot be closed while it still
//    holds a token balance, because `close_vault` requires the token account
//    to be empty first (checked in-handler, not just trusted from the client).
// 7. No `unsafe`, no raw CPI to unchecked programs, no unchecked account
//    reallocation.
//
// This program still needs a real security review (and ideally an audit)
// before handling real value. Treat this as a solid, defensively-coded
// starting point, not a finished audited product.
// ---------------------------------------------------------------------------

#[program]
pub mod secure_token_vault {
    use super::*;

    /// Creates a new vault owned by `owner` for a specific SPL token mint.
    /// The vault's token account authority is a PDA derived from the owner
    /// and mint, so only this program (via `withdraw`) can ever move funds
    /// out of it.
    pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.owner = ctx.accounts.owner.key();
        vault.mint = ctx.accounts.mint.key();
        vault.token_account = ctx.accounts.vault_token_account.key();
        vault.bump = ctx.bumps.vault;
        vault.total_deposited = 0;

        emit!(VaultInitialized {
            vault: vault.key(),
            owner: vault.owner,
            mint: vault.mint,
        });
        Ok(())
    }

    /// Deposits `amount` tokens from the depositor's token account into the
    /// vault. Anyone may deposit into an existing vault (e.g. for an escrow
    /// use case); only the owner can withdraw.
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        require!(amount > 0, VaultError::ZeroAmount);

        let cpi_accounts = Transfer {
            from: ctx.accounts.depositor_token_account.to_account_info(),
            to: ctx.accounts.vault_token_account.to_account_info(),
            authority: ctx.accounts.depositor.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        let vault = &mut ctx.accounts.vault;
        vault.total_deposited = vault
            .total_deposited
            .checked_add(amount)
            .ok_or(VaultError::MathOverflow)?;

        emit!(Deposited {
            vault: vault.key(),
            depositor: ctx.accounts.depositor.key(),
            amount,
        });
        Ok(())
    }

    /// Withdraws `amount` tokens from the vault to the owner's token
    /// account. Only the vault owner (must sign) can call this. The PDA
    /// signs the underlying token transfer via `invoke_signed`, generated
    /// automatically by Anchor's `CpiContext::new_with_signer`.
    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        require!(amount > 0, VaultError::ZeroAmount);
        require!(
            ctx.accounts.vault_token_account.amount >= amount,
            VaultError::InsufficientFunds
        );

        let owner_key = ctx.accounts.owner.key();
        let mint_key = ctx.accounts.mint.key();
        let bump = ctx.accounts.vault.bump;
        let seeds: &[&[u8]] = &[b"vault", owner_key.as_ref(), mint_key.as_ref(), &[bump]];
        let signer_seeds: &[&[&[u8]]] = &[seeds];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault_token_account.to_account_info(),
            to: ctx.accounts.owner_token_account.to_account_info(),
            authority: ctx.accounts.vault.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );
        token::transfer(cpi_ctx, amount)?;

        let vault = &mut ctx.accounts.vault;
        vault.total_deposited = vault
            .total_deposited
            .checked_sub(amount)
            .ok_or(VaultError::MathOverflow)?;

        emit!(Withdrawn {
            vault: vault.key(),
            owner: owner_key,
            amount,
        });
        Ok(())
    }

    /// Closes the vault account and reclaims its rent to the owner. Refuses
    /// to close while the underlying token account still holds a balance,
    /// so funds can never be silently stranded or a close used to bypass
    /// withdrawal accounting.
    pub fn close_vault(ctx: Context<CloseVault>) -> Result<()> {
        require!(
            ctx.accounts.vault_token_account.amount == 0,
            VaultError::VaultNotEmpty
        );
        emit!(VaultClosed {
            vault: ctx.accounts.vault.key(),
            owner: ctx.accounts.owner.key(),
        });
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    pub mint: Account<'info, Mint>,

    #[account(
        init,
        payer = owner,
        space = 8 + Vault::SIZE,
        seeds = [b"vault_state", owner.key().as_ref(), mint.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        init,
        payer = owner,
        seeds = [b"vault", owner.key().as_ref(), mint.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = vault,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub depositor: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault_state", vault.owner.as_ref(), vault.mint.as_ref()],
        bump = vault.bump,
        has_one = mint,
    )]
    pub vault: Account<'info, Vault>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint = depositor_token_account.mint == mint.key() @ VaultError::MintMismatch,
        constraint = depositor_token_account.owner == depositor.key() @ VaultError::TokenAccountOwnerMismatch,
    )]
    pub depositor_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        address = vault.token_account @ VaultError::VaultTokenAccountMismatch,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault_state", owner.key().as_ref(), mint.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ VaultError::Unauthorized,
        has_one = mint,
    )]
    pub vault: Account<'info, Vault>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        address = vault.token_account @ VaultError::VaultTokenAccountMismatch,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = owner_token_account.mint == mint.key() @ VaultError::MintMismatch,
        constraint = owner_token_account.owner == owner.key() @ VaultError::TokenAccountOwnerMismatch,
    )]
    pub owner_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CloseVault<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        close = owner,
        seeds = [b"vault_state", owner.key().as_ref(), vault.mint.as_ref()],
        bump = vault.bump,
        has_one = owner @ VaultError::Unauthorized,
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        address = vault.token_account @ VaultError::VaultTokenAccountMismatch,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

#[account]
pub struct Vault {
    pub owner: Pubkey,
    pub mint: Pubkey,
    pub token_account: Pubkey,
    pub total_deposited: u64,
    pub bump: u8,
}

impl Vault {
    // 32 (owner) + 32 (mint) + 32 (token_account) + 8 (total_deposited) + 1 (bump)
    pub const SIZE: usize = 32 + 32 + 32 + 8 + 1;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

#[event]
pub struct VaultInitialized {
    pub vault: Pubkey,
    pub owner: Pubkey,
    pub mint: Pubkey,
}

#[event]
pub struct Deposited {
    pub vault: Pubkey,
    pub depositor: Pubkey,
    pub amount: u64,
}

#[event]
pub struct Withdrawn {
    pub vault: Pubkey,
    pub owner: Pubkey,
    pub amount: u64,
}

#[event]
pub struct VaultClosed {
    pub vault: Pubkey,
    pub owner: Pubkey,
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

#[error_code]
pub enum VaultError {
    #[msg("Amount must be greater than zero.")]
    ZeroAmount,
    #[msg("Arithmetic overflow or underflow.")]
    MathOverflow,
    #[msg("Insufficient funds in vault.")]
    InsufficientFunds,
    #[msg("Only the vault owner may perform this action.")]
    Unauthorized,
    #[msg("Token account mint does not match vault mint.")]
    MintMismatch,
    #[msg("Token account owner does not match expected signer.")]
    TokenAccountOwnerMismatch,
    #[msg("Provided token account does not match the vault's token account.")]
    VaultTokenAccountMismatch,
    #[msg("Vault still holds a balance and cannot be closed.")]
    VaultNotEmpty,
}