use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkC6zwa1A3zCSJWc5VY2yGgX4S1f4jiMsm");

#[program]
pub mod secure_contract {
    use super::*;

    pub fn withdraw_funds(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        // Safe: Checked Arithmetic
        let fee = amount.checked_mul(5).unwrap().checked_div(100).unwrap();
        let payout = amount.checked_sub(fee).unwrap();
        
        // Safe: Anchor native close constraint (handled via #[account(close = authority)] in struct)
        Ok(())
    }

    pub fn process_native(program_id: &Pubkey, accounts: &[AccountInfo], amount: u64) -> ProgramResult {
        let accounts_iter = &mut accounts.iter();
        let user = next_account_info(accounts_iter)?;
        let vault = next_account_info(accounts_iter)?;

        // Safe: Signer Check
        if !user.is_signer {
            return Err(ProgramError::MissingRequiredSignature.into());
        }

        // Safe: Ownership Check
        if vault.owner != program_id {
            return Err(ProgramError::IncorrectProgramId.into());
        }

        let mut data = vault.try_borrow_mut_data()?;
        data[0] = 1;

        // Safe: Rent Exemption Check
        let rent = Rent::get()?;
        let lamports = vault.lamports();
        let space = data.len();
        if !rent.is_exempt(lamports, space) {
            return Err(ProgramError::AccountNotRentExempt.into());
        }

        // Safe: Constrained CPI
        let other_program = next_account_info(accounts_iter)?;
        if other_program.key != &some_valid_program::ID {
            return Err(ProgramError::IncorrectProgramId.into());
        }
        
        let ix = Instruction {
            program_id: *other_program.key,
            accounts: vec![],
            data: vec![],
        };
        invoke(&ix, &[other_program.clone()])?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    // Safe: Signer and Owner checked, close targets authority
    #[account(
        mut,
        close = authority,
        seeds = [b"vault_state"],
        bump
    )]
    pub vault: Account<'info, VaultState>,
    
    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct VaultState {
    pub value: u64,
}
