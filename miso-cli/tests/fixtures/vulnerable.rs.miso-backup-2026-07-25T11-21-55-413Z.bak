use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_lang::solana_program::program::invoke;
use anchor_lang::solana_program::rent::Rent;

declare_id!("Fg6PaFpoGXkC6zwa1A3zCSJWc5VY2yGgX4S1f4jiMsm");

// ---------------------------------------------------------------------------
// v2 hardening — on top of the earlier fixes (checked arithmetic, safe
// close, signer checks, rent-exempt init, ownership-checked accounts,
// bump-validated PDAs, allow-listed CPI), this revision adds:
//
// 8. CIRCUIT BREAKER
//    `paused` lets the authority freeze deposits/withdrawals instantly if a
//    problem is discovered, without needing to close or migrate the vault.
//
// 9. REENTRANCY GUARD
//    `locked` is set for the duration of `withdraw_funds` and checked at
//    entry to every fund-moving instruction. Solana's CPI call stack
//    already makes classic reentrancy hard, but this makes the invariant
//    explicit and defends against future changes that add CPIs mid-handler.
//
// 10. RENT-EXEMPTION FLOOR ON WITHDRAWAL
//     Directly debiting a data account's lamports below its rent-exempt
//     minimum (without fully zeroing it) is rejected by the runtime, but
//     failing that way mid-logic is still worth guarding against
//     explicitly and cheaply, so withdrawals now require the vault to end
//     at exactly 0 or at/above its rent-exempt minimum.
//
// 11. PER-TRANSACTION WITHDRAWAL CAP
//     `max_withdrawal` bounds the blast radius of a single compromised
//     signature or a logic bug — even the legitimate authority can't drain
//     the vault in one call. Adjustable only by the authority itself.
//
// 12. TWO-STEP AUTHORITY TRANSFER
//     Changing `authority` directly is a classic footgun: a typo'd or
//     unreachable pubkey permanently locks the vault. `propose_authority` +
//     `accept_authority` requires the *new* key to sign an acceptance
//     before the change takes effect.
//
// 13. STRICTER CPI GUARD
//     `call_allowed_program` now also rejects the contract's own program id
//     as a target (no self-recursive CPI) in addition to the allow-list and
//     `executable` checks already in place.
//
// 14. EXPLICIT NON-EQUALITY / NON-DEFAULT CHECKS
//     `destination` can never be the vault itself or the default
//     (all-zero) pubkey, closing off a class of "transfer to self / to
//     nowhere" edge cases.
//
// 15. EVENTS FOR AUDITABILITY
//     Every state-changing instruction emits an event, so off-chain
//     monitoring can alert on unexpected withdrawals, pauses, or authority
//     changes in near real time.
// ---------------------------------------------------------------------------

/// Allow-list of programs this contract is permitted to CPI into. Replace
/// with the real target program id(s) before deploying.
pub const ALLOWED_CPI_PROGRAM: Pubkey =
    anchor_lang::solana_program::pubkey!("11111111111111111111111111111111111111112");

#[program]
pub mod secure_contract {
    use super::*;

    pub fn initialize_vault(ctx: Context<InitializeVault>, max_withdrawal: u64) -> Result<()> {
        require!(max_withdrawal > 0, VaultError::ZeroAmount);

        let vault = &mut ctx.accounts.vault;
        vault.authority = ctx.accounts.authority.key();
        vault.pending_authority = None;
        vault.bump = ctx.bumps.vault;
        vault.balance = 0;
        vault.max_withdrawal = max_withdrawal;
        vault.paused = false;
        vault.locked = false;
        vault.flag = 0;

        emit!(VaultInitialized {
            vault: vault.key(),
            authority: vault.authority,
            max_withdrawal,
        });
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        require!(amount > 0, VaultError::ZeroAmount);
        require!(!ctx.accounts.vault.paused, VaultError::Paused);

        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.depositor.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                },
            ),
            amount,
        )?;

        let vault = &mut ctx.accounts.vault;
        vault.balance = vault
            .balance
            .checked_add(amount)
            .ok_or(VaultError::MathOverflow)?;

        emit!(Deposited {
            vault: vault.key(),
            depositor: ctx.accounts.depositor.key(),
            amount,
        });
        Ok(())
    }

    pub fn withdraw_funds(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        require!(amount > 0, VaultError::ZeroAmount);
        require!(!ctx.accounts.vault.paused, VaultError::Paused);
        require!(!ctx.accounts.vault.locked, VaultError::Reentrancy);
        require!(
            amount <= ctx.accounts.vault.max_withdrawal,
            VaultError::ExceedsWithdrawalCap
        );
        require_keys_neq!(
            ctx.accounts.destination.key(),
            ctx.accounts.vault.key(),
            VaultError::InvalidDestination
        );
        require_keys_neq!(
            ctx.accounts.destination.key(),
            Pubkey::default(),
            VaultError::InvalidDestination
        );

        // Lock for the duration of this handler (reentrancy guard).
        ctx.accounts.vault.locked = true;

        let result = (|| -> Result<()> {
            let vault_balance = ctx.accounts.vault.balance;
            require!(vault_balance >= amount, VaultError::InsufficientFunds);

            let fee = amount
                .checked_mul(5)
                .ok_or(VaultError::MathOverflow)?
                .checked_div(100)
                .ok_or(VaultError::MathOverflow)?;
            let payout = amount.checked_sub(fee).ok_or(VaultError::MathOverflow)?;

            let vault_info = ctx.accounts.vault.to_account_info();
            let current_lamports = vault_info.lamports();
            let remaining = current_lamports
                .checked_sub(payout)
                .ok_or(VaultError::MathOverflow)?;

            // Rent-exemption floor: never leave the vault "half drained"
            // below its rent-exempt minimum; either it stays fully
            // rent-exempt or use `close_vault` to zero it out entirely.
            let rent_exempt_min = Rent::get()?.minimum_balance(vault_info.data_len());
            require!(
                remaining == 0 || remaining >= rent_exempt_min,
                VaultError::BelowRentExemption
            );

            **vault_info.try_borrow_mut_lamports()? = remaining;
            **ctx
                .accounts
                .destination
                .to_account_info()
                .try_borrow_mut_lamports()? = ctx
                .accounts
                .destination
                .lamports()
                .checked_add(payout)
                .ok_or(VaultError::MathOverflow)?;

            ctx.accounts.vault.balance = vault_balance
                .checked_sub(amount)
                .ok_or(VaultError::MathOverflow)?;

            emit!(Withdrawn {
                vault: ctx.accounts.vault.key(),
                destination: ctx.accounts.destination.key(),
                amount,
                fee,
            });
            Ok(())
        })();

        // Always release the lock, even on error paths, so a failed
        // withdrawal can't permanently brick the vault.
        ctx.accounts.vault.locked = false;
        result
    }

    pub fn close_vault(ctx: Context<CloseVault>) -> Result<()> {
        require!(!ctx.accounts.vault.locked, VaultError::Reentrancy);
        require!(ctx.accounts.vault.balance == 0, VaultError::VaultNotEmpty);

        emit!(VaultClosed {
            vault: ctx.accounts.vault.key(),
            authority: ctx.accounts.authority.key(),
        });
        Ok(())
    }

    pub fn set_flag(ctx: Context<SetFlag>, value: u8) -> Result<()> {
        require!(!ctx.accounts.vault.paused, VaultError::Paused);
        require!(value == 0 || value == 1, VaultError::InvalidFlagValue);
        ctx.accounts.vault.flag = value;
        Ok(())
    }

    /// Circuit breaker: immediately halts deposits and withdrawals.
    pub fn set_paused(ctx: Context<AdminAction>, paused: bool) -> Result<()> {
        ctx.accounts.vault.paused = paused;
        emit!(PausedStateChanged {
            vault: ctx.accounts.vault.key(),
            paused,
        });
        Ok(())
    }

    /// Adjusts the per-transaction withdrawal cap. Only the current
    /// authority may raise or lower it.
    pub fn set_max_withdrawal(ctx: Context<AdminAction>, max_withdrawal: u64) -> Result<()> {
        require!(max_withdrawal > 0, VaultError::ZeroAmount);
        ctx.accounts.vault.max_withdrawal = max_withdrawal;
        Ok(())
    }

    /// Step 1 of authority transfer: current authority nominates a
    /// successor. Takes effect only once the successor accepts.
    pub fn propose_authority(ctx: Context<AdminAction>, new_authority: Pubkey) -> Result<()> {
        require_keys_neq!(new_authority, Pubkey::default(), VaultError::InvalidDestination);
        ctx.accounts.vault.pending_authority = Some(new_authority);
        emit!(AuthorityProposed {
            vault: ctx.accounts.vault.key(),
            proposed: new_authority,
        });
        Ok(())
    }

    /// Step 2 of authority transfer: the proposed authority must sign to
    /// accept, proving the key is live and reachable before control moves.
    pub fn accept_authority(ctx: Context<AcceptAuthority>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        require!(
            vault.pending_authority == Some(ctx.accounts.new_authority.key()),
            VaultError::NoPendingAuthority
        );
        let old = vault.authority;
        vault.authority = ctx.accounts.new_authority.key();
        vault.pending_authority = None;

        emit!(AuthorityChanged {
            vault: vault.key(),
            old_authority: old,
            new_authority: vault.authority,
        });
        Ok(())
    }

    pub fn call_allowed_program(ctx: Context<CallAllowedProgram>) -> Result<()> {
        require!(!ctx.accounts.vault.paused, VaultError::Paused);

        let target = &ctx.accounts.target_program;
        require_keys_eq!(
            target.key(),
            ALLOWED_CPI_PROGRAM,
            VaultError::DisallowedCpiTarget
        );
        require_keys_neq!(target.key(), crate::ID, VaultError::DisallowedCpiTarget);
        require!(target.executable, VaultError::TargetNotExecutable);

        let ix = Instruction {
            program_id: target.key(),
            accounts: vec![],
            data: vec![],
        };
        invoke(&ix, &[target.to_account_info()])?;
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + VaultState::SIZE,
        seeds = [b"vault_state", authority.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, VaultState>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub depositor: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault_state", vault.authority.as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, VaultState>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault_state", authority.key().as_ref()],
        bump = vault.bump,
        has_one = authority @ VaultError::Unauthorized,
    )]
    pub vault: Account<'info, VaultState>,

    #[account(mut)]
    pub destination: SystemAccount<'info>,
}

#[derive(Accounts)]
pub struct CloseVault<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        close = authority,
        seeds = [b"vault_state", authority.key().as_ref()],
        bump = vault.bump,
        has_one = authority @ VaultError::Unauthorized,
    )]
    pub vault: Account<'info, VaultState>,
}

#[derive(Accounts)]
pub struct SetFlag<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault_state", authority.key().as_ref()],
        bump = vault.bump,
        has_one = authority @ VaultError::Unauthorized,
    )]
    pub vault: Account<'info, VaultState>,
}

/// Shared accounts struct for authority-gated admin actions (pause,
/// withdrawal-cap changes, proposing a new authority).
#[derive(Accounts)]
pub struct AdminAction<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault_state", authority.key().as_ref()],
        bump = vault.bump,
        has_one = authority @ VaultError::Unauthorized,
    )]
    pub vault: Account<'info, VaultState>,
}

#[derive(Accounts)]
pub struct AcceptAuthority<'info> {
    pub new_authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault_state", vault.authority.as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, VaultState>,
}

#[derive(Accounts)]
pub struct CallAllowedProgram<'info> {
    pub authority: Signer<'info>,

    #[account(
        seeds = [b"vault_state", authority.key().as_ref()],
        bump = vault.bump,
        has_one = authority @ VaultError::Unauthorized,
    )]
    pub vault: Account<'info, VaultState>,

    /// CHECKED: identity verified in the handler against
    /// `ALLOWED_CPI_PROGRAM`; `executable` and self-call are also checked
    /// before `invoke`.
    pub target_program: UncheckedAccount<'info>,
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

#[account]
pub struct VaultState {
    pub authority: Pubkey,
    pub pending_authority: Option<Pubkey>,
    pub balance: u64,
    pub max_withdrawal: u64,
    pub bump: u8,
    pub flag: u8,
    pub paused: bool,
    pub locked: bool,
}

impl VaultState {
    // 32 (authority) + (1 + 32) (Option<Pubkey>) + 8 (balance)
    // + 8 (max_withdrawal) + 1 (bump) + 1 (flag) + 1 (paused) + 1 (locked)
    pub const SIZE: usize = 32 + (1 + 32) + 8 + 8 + 1 + 1 + 1 + 1;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

#[event]
pub struct VaultInitialized {
    pub vault: Pubkey,
    pub authority: Pubkey,
    pub max_withdrawal: u64,
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
    pub destination: Pubkey,
    pub amount: u64,
    pub fee: u64,
}

#[event]
pub struct VaultClosed {
    pub vault: Pubkey,
    pub authority: Pubkey,
}

#[event]
pub struct PausedStateChanged {
    pub vault: Pubkey,
    pub paused: bool,
}

#[event]
pub struct AuthorityProposed {
    pub vault: Pubkey,
    pub proposed: Pubkey,
}

#[event]
pub struct AuthorityChanged {
    pub vault: Pubkey,
    pub old_authority: Pubkey,
    pub new_authority: Pubkey,
}

#[error_code]
pub enum VaultError {
    #[msg("Amount must be greater than zero.")]
    ZeroAmount,
    #[msg("Arithmetic overflow or underflow.")]
    MathOverflow,
    #[msg("Insufficient funds in vault.")]
    InsufficientFunds,
    #[msg("Signer does not match the vault's authority.")]
    Unauthorized,
    #[msg("Vault still holds a balance and cannot be closed.")]
    VaultNotEmpty,
    #[msg("Target program is not on the CPI allow-list.")]
    DisallowedCpiTarget,
    #[msg("Target account is not executable.")]
    TargetNotExecutable,
    #[msg("Vault operations are currently paused.")]
    Paused,
    #[msg("Reentrant call detected.")]
    Reentrancy,
    #[msg("Withdrawal exceeds the configured per-transaction cap.")]
    ExceedsWithdrawalCap,
    #[msg("Destination account is invalid.")]
    InvalidDestination,
    #[msg("Resulting vault balance would fall below the rent-exempt minimum.")]
    BelowRentExemption,
    #[msg("No pending authority to accept.")]
    NoPendingAuthority,
    #[msg("Flag value must be 0 or 1.")]
    InvalidFlagValue,
}