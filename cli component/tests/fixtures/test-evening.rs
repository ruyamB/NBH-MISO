use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
};

#[derive(BorshSerialize, BorshDeserialize)]
pub struct Counter {
    pub count: u64,
}

entrypoint!(process_instruction);

pub fn process_instruction(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let account = next_account_info(&mut accounts.iter())?;

    let mut counter = Counter::try_from_slice(&account.data.borrow())
        .unwrap_or(Counter { count: 0 });

    match instruction_data.first() {
        Some(0) => {
            counter.count = 0;
            msg!("Counter initialized");
        }
        Some(1) => {
            counter.count += 1;
            msg!("Counter incremented to {}", counter.count);
        }
        _ => {
            return Err(ProgramError::InvalidInstructionData);
        }
    }

    counter.serialize(&mut &mut account.data.borrow_mut()[..])?;

    Ok(())
}