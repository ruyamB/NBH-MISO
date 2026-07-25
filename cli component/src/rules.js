import { parseAttribute } from './parser.js';

export const RULES = [
  {
    id: 'MISSING_SIGNER_CHECK',
    severity: 'Critical',
    deduction: 25,
    description: 'Mutable account instruction lacks signer validation.',
    recommendation: 'Ensure the authority or caller is verified using Signer<\'info> or an explicit is_signer check.',
    check(parsed, fileLines) {
      const findings = [];

      // Check Anchor accounts structs
      for (const struct of parsed.structs) {
        const isAccountsStruct = struct.attributes.some(attr => {
          const parsedAttr = parseAttribute(attr.value);
          return parsedAttr.name === 'derive' && parsedAttr.args.includes('Accounts');
        });

        if (isAccountsStruct) {
          const hasMutField = struct.fields.some(field => 
            field.attributes.some(attr => {
              const parsedAttr = parseAttribute(attr.value);
              return parsedAttr.name === 'account' && parsedAttr.args.some(arg => arg === 'mut' || arg.startsWith('mut'));
            })
          );

          if (hasMutField) {
            const hasSigner = struct.fields.some(field => {
              const isSignerType = field.type.includes('Signer');
              const hasSignerAttr = field.attributes.some(attr => {
                const parsedAttr = parseAttribute(attr.value);
                return parsedAttr.name === 'account' && parsedAttr.args.includes('signer');
              });
              return isSignerType || hasSignerAttr;
            });

            if (!hasSigner) {
              findings.push({
                line: struct.line,
                details: `Struct "${struct.name}" contains mutable accounts but has no Signer field or signer attribute constraint.`
              });
            }
          }
        }
      }

      // Check Native program functions
      for (const fn of parsed.functions) {
        const hasMutSignerCheck = fn.rawBody.includes('is_signer') || fn.rawBody.includes('Signer');
        const hasMutations = fn.rawBody.includes('try_borrow_mut_data') || fn.rawBody.includes('borrow_mut') || fn.rawBody.includes('serialize');
        
        if (hasMutations && !hasMutSignerCheck && !fn.name.startsWith('query')) {
          findings.push({
            line: fn.line,
            details: `Function "${fn.name}" modifies account data but lacks an is_signer verification check.`
          });
        }
      }

      return findings;
    }
  },
  {
    id: 'UNCHECKED_ARITHMETIC',
    severity: 'Medium',
    deduction: 6,
    description: 'Integer overflow/underflow vulnerability from unchecked arithmetic.',
    recommendation: 'Replace raw arithmetic operators (+, -, *, /) with checked alternatives like checked_add(), checked_sub(), checked_mul(), checked_div().',
    check(parsed, fileLines) {
      const findings = [];

      for (const fn of parsed.functions) {
        let hasCheckedCall = fn.rawBody.includes('checked_') || fn.rawBody.includes('safe_');
        
        // Scan tokens in the body to find operators
        let i = 0;
        const bodyTokens = fn.bodyTokens;
        
        while (i < bodyTokens.length) {
          const tok = bodyTokens[i];
          
          if (tok.type === 'OPERATOR') {
            const op = tok.value;
            if (['+', '-', '*', '/'].includes(op)) {
              // Exclude constants, loops, or declarations
              const prev = bodyTokens[i - 1];
              const next = bodyTokens[i + 1];
              
              const isConstantExpr = prev && prev.type === 'NUMBER' && next && next.type === 'NUMBER';
              const isForLoopRange = (prev && prev.value === 'in') || (next && next.value === '..');
              
              // Exclude dereferences/unary operations:
              // If op is '*' or '-' and the previous token is not an identifier, number, or closing brace/parenthesis/bracket, then it's unary!
              const isUnary = (op === '*' || op === '-') && 
                (!prev || (!['IDENT', 'NUMBER'].includes(prev.type) && !['}', ')', ']'].includes(prev.value)));

              if (!isConstantExpr && !isForLoopRange && !isUnary && !hasCheckedCall) {
                findings.push({
                  line: tok.line,
                  details: `Raw arithmetic operator "${op}" detected. Consider using checked arithmetic to prevent overflow/underflow.`
                });
              }
            }
          }
          i++;
        }
      }

      return findings;
    }
  },
  {
    id: 'PDA_BUMP_UNVALIDATED',
    severity: 'High',
    deduction: 12,
    description: 'PDA bump seed is not validated, exposing to seed collision vulnerability.',
    recommendation: 'Verify the bump seed by using Anchor\'s canonical bump detection or explicitly checking the bump using Pubkey::create_program_address.',
    check(parsed, fileLines) {
      const findings = [];

      for (const struct of parsed.structs) {
        const isAccountsStruct = struct.attributes.some(attr => {
          const parsedAttr = parseAttribute(attr.value);
          return parsedAttr.name === 'derive' && parsedAttr.args.includes('Accounts');
        });

        if (isAccountsStruct) {
          for (const field of struct.fields) {
            field.attributes.forEach(attr => {
              const parsedAttr = parseAttribute(attr.value);
              if (parsedAttr.name === 'account') {
                const hasSeeds = parsedAttr.args.some(arg => arg.startsWith('seeds =') || arg.includes('seeds'));
                const hasBump = parsedAttr.args.some(arg => arg === 'bump' || arg.startsWith('bump =') || arg.includes('bump'));

                if (hasSeeds && !hasBump) {
                  findings.push({
                    line: field.line,
                    details: `Field "${field.name}" in "${struct.name}" defines seeds but does not validate or specify a "bump".`
                  });
                }
              }
            });
          }
        }
      }

      for (const fn of parsed.functions) {
        if (fn.rawBody.includes('create_program_address') && !fn.rawBody.includes('find_program_address') && !fn.rawBody.includes('bump')) {
          findings.push({
            line: fn.line,
            details: `Function "${fn.name}" calls "create_program_address" without visible bump validation. Use "find_program_address" for canonical derivation.`
          });
        }
      }

      return findings;
    }
  },
  {
    id: 'MISSING_OWNERSHIP_CHECK',
    severity: 'Critical',
    deduction: 25,
    description: 'Account owner is not validated.',
    recommendation: 'Verify that the account\'s owner matches the expected program ID or use typed Accounts/AccountInfo wrapper validations.',
    check(parsed, fileLines) {
      const findings = [];

      for (const struct of parsed.structs) {
        const isAccountsStruct = struct.attributes.some(attr => {
          const parsedAttr = parseAttribute(attr.value);
          return parsedAttr.name === 'derive' && parsedAttr.args.includes('Accounts');
        });

        if (isAccountsStruct) {
          for (const field of struct.fields) {
            const isUntyped = field.type.includes('AccountInfo') || field.type.includes('UncheckedAccount');
            if (isUntyped) {
              const hasOwnerCheck = field.attributes.some(attr => {
                const parsedAttr = parseAttribute(attr.value);
                return parsedAttr.name === 'account' && parsedAttr.args.some(arg => arg.includes('owner') || arg.includes('constraint'));
              });

              if (!hasOwnerCheck) {
                findings.push({
                  line: field.line,
                  details: `Field "${field.name}" in "${struct.name}" is an untyped AccountInfo/UncheckedAccount and lacks an owner constraint check.`
                });
              }
            }
          }
        }
      }

      for (const fn of parsed.functions) {
        const hasOwnerCheck = fn.rawBody.includes('owner') || fn.rawBody.includes('check_owner') || fn.rawBody.includes('program_id');
        const hasDataReads = fn.rawBody.includes('try_borrow_data') || fn.rawBody.includes('borrow') || fn.rawBody.includes('data.borrow');

        if (hasDataReads && !hasOwnerCheck && !fn.name.startsWith('query')) {
          findings.push({
            line: fn.line,
            details: `Function "${fn.name}" reads account data but does not explicitly check if the account owner matches the program ID.`
          });
        }
      }

      return findings;
    }
  },
  {
    id: 'UNSAFE_ACCOUNT_CLOSE',
    severity: 'High',
    deduction: 12,
    description: 'Account is closed unsafely without clearing data or updating the owner.',
    recommendation: 'Zero out the data of closed accounts, reassign the owner to the System Program, or use Anchor\'s native close constraint: #[account(close = target)].',
    check(parsed, fileLines) {
      const findings = [];

      for (const fn of parsed.functions) {
        const drainsLamports = /lamports\s+\.\s+borrow_mut\s*\(\s*\)\s*.*=\s*0/.test(fn.rawBody) || /lamports\s+.*-=\s*/.test(fn.rawBody);
        const reassignsOwner = fn.rawBody.includes('system_program::ID') || fn.rawBody.includes('System') || fn.rawBody.includes('set_owner') || fn.rawBody.includes('owner =');
        const clearsData = fn.rawBody.includes('clear') || fn.rawBody.includes('discriminator') || fn.rawBody.includes('data.borrow_mut');

        if (drainsLamports && (!reassignsOwner || !clearsData)) {
          findings.push({
            line: fn.line,
            details: `Function "${fn.name}" appears to close/drain lamports from an account without safely clearing its data or reassigning ownership.`
          });
        }
      }

      return findings;
    }
  },
  {
    id: 'MISSING_RENT_EXEMPTION',
    severity: 'Medium',
    deduction: 6,
    description: 'Missing rent-exemption validation on custom account initialization.',
    recommendation: 'Verify the account meets rent-exemption minimum requirements using Rent::get()?.is_exempt(lamports, space).',
    check(parsed, fileLines) {
      const findings = [];

      for (const fn of parsed.functions) {
        const isInitializing = fn.rawBody.includes('create_account') || fn.rawBody.includes('init_account');
        const checksRent = fn.rawBody.includes('is_exempt') || fn.rawBody.includes('minimum_balance');

        if (isInitializing && !checksRent) {
          findings.push({
            line: fn.line,
            details: `Function "${fn.name}" initializes a Solana account but does not validate if the account is rent-exempt.`
          });
        }
      }

      return findings;
    }
  },
  {
    id: 'UNCONSTRAINED_CPI',
    severity: 'High',
    deduction: 12,
    description: 'Unconstrained CPI (Cross-Program Invocation) call.',
    recommendation: 'Verify the target program account key before calling invoke() or invoke_signed() to prevent hijacking.',
    check(parsed, fileLines) {
      const findings = [];

      for (const fn of parsed.functions) {
        const callsCpi = fn.rawBody.includes('invoke') || fn.rawBody.includes('invoke_signed');
        const validatesProgram = fn.rawBody.includes('key') && (fn.rawBody.includes('==') || fn.rawBody.includes('check') || fn.rawBody.includes('ID') || fn.rawBody.includes('eq('));

        if (callsCpi && !validatesProgram) {
          findings.push({
            line: fn.line,
            details: `Function "${fn.name}" performs a Cross-Program Invocation (CPI) without validating the target program ID.`
          });
        }
      }

      return findings;
    }
  }
];
