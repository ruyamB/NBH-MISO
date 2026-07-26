import fs from 'fs';
import path from 'path';
import { loadConfig, promptUser, ensureApiKeyOrChoice } from '../config.js';

export async function handleCreate(args = []) {
  console.log('\x1b[36m━━━  MISO Solana Smart Contract Generator  ━━━\x1b[0m\n');

  // Step 1: Resolve target path & user description/prompt
  let targetPath = '';
  let userPrompt = '';

  // Check arguments for path or inline prompt
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.endsWith('.rs') || arg.includes('/') || arg.includes('\\')) {
      targetPath = arg;
    } else if (arg === '--prompt' || arg === '-p') {
      userPrompt = args.slice(i + 1).join(' ');
      break;
    } else if (!userPrompt && !arg.startsWith('-')) {
      userPrompt += (userPrompt ? ' ' : '') + arg;
    }
  }

  if (!targetPath) {
    if (fs.existsSync('src')) {
      targetPath = path.join('src', 'lib.rs');
    } else {
      targetPath = 'lib.rs';
    }
  }

  // Interactive prompt if user prompt was not provided in command line
  if (!userPrompt.trim() && process.stdin.isTTY && process.env.MISO_TEST !== 'true') {
    const input = await promptUser('Enter description / prompt for the Solana Rust contract: ');
    userPrompt = input.trim();
  }

  if (!userPrompt.trim()) {
    userPrompt = 'Create a Solana Anchor smart contract for vault management and token transfers.';
  }

  console.log(`\x1b[36mContract Description / Prompt:\x1b[0m "${userPrompt}"`);

  const dir = path.dirname(targetPath);
  if (dir && dir !== '.' && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Step 2: Resolve API Key & Provider
  const { apiKey, staticOnly } = await ensureApiKeyOrChoice();

  let contractCode = '';

  if (apiKey && !staticOnly) {
    console.log('\x1b[36mGenerating Solana Rust smart contract using AI model & user prompt...\x1b[0m');
    try {
      const { callLLMForPatch } = await import('../llm/llmClient.js');
      const llmPrompt = `You are an expert Solana Rust smart contract developer.
Generate a complete, compilable Solana Rust Anchor smart contract based on the following user requirements:
"${userPrompt}"

CRITICAL AUDIT TESTING REQUIREMENTS:
1. It MUST be a valid, compilable Anchor / Solana program in Rust.
2. It MUST contain intentional security vulnerabilities (such as missing signer checks, unverified account info, or raw unverified arithmetic) so that when audited by MISO scanner, its security confidence score evaluates to between 30 and 50 out of 100.
3. Return ONLY the raw Rust source code block wrapped in \`\`\`rust ... \`\`\`. Do not include conversational text or explanations.`;

      const response = await callLLMForPatch(llmPrompt, { apiKey });
      const match = response.match(/```(?:rust)?\s*([\s\S]*?)```/i);
      if (match && match[1].trim()) {
        contractCode = match[1].trim();
      }
    } catch (err) {
      console.log(`\x1b[33mAI generation fallback (${err.message}): using specialized vulnerable contract template.\x1b[0m`);
    }
  }

  if (!contractCode) {
    // Specialized template engineered to evaluate to 30-50/100 score range
    contractCode = `use anchor_lang::prelude::*;

declare_id!("MisoVault1111111111111111111111111111111111");

// Program generated based on prompt: "${userPrompt.replace(/"/g, "'")}"
#[program]
pub mod miso_vault {
    use super::*;

    pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.owner = ctx.accounts.authority.key();
        vault.balance = 1000;
        msg!("Vault initialized for requirement: {}", "${userPrompt.replace(/"/g, "'")}");
        Ok(())
    }

    // Vulnerability 1: Missing Signer Check (MISSING_SIGNER_CHECK: -25 pts)
    // AccountInfo used for authority without Signer validation
    pub fn withdraw(ctx: Context<WithdrawVault>, amount: u64) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        
        // Vulnerability 2: Unsafe Arithmetic (UNSAFE_ARITHMETIC: -15 pts)
        let remaining_balance = vault.balance - amount;
        vault.balance = remaining_balance;
        
        msg!("Withdrawn: {}", amount);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(init, payer = authority, space = 8 + 32 + 8)]
    pub vault: Account<'info, VaultState>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawVault<'info> {
    #[account(mut)]
    pub vault: Account<'info, VaultState>,
    // Vulnerability: AccountInfo instead of Signer<'info>
    pub authority: AccountInfo<'info>,
}

#[account]
pub struct VaultState {
    pub owner: Pubkey,
    pub balance: u64,
}
`;
  }

  fs.writeFileSync(targetPath, contractCode, 'utf8');

  console.log(`\n\x1b[32m✔ Created Solana Rust contract file at:\x1b[0m \x1b[1m${targetPath}\x1b[0m`);
  console.log(`\x1b[33mNotice: Contract generated with target confidence score range: 30-50/100\x1b[0m`);
  console.log(`\x1b[36mRun "npx miso scan --file ${targetPath}" to audit this contract.\x1b[0m\n`);
}
