{
  "Withdraw": {
    "accounts": [
      {
        "vault": {
          "account": "AccountInfo<'info>",
          "constraint": "vault.owner == &system_program::ID"
        }
      },
      {
        "signer": {
          "account": "AccountInfo<'info>",
          "constraint": "signer"
        }
      }
    ],
    "instruction": "Update the vault state before transfer"
  }
}