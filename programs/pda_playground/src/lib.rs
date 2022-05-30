use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};

declare_id!("8RnFjzBBPSyCpTCTAfuCDWdUVkCb1UKFZkUDuBF8E3Dx");

#[program]
pub mod pda_playground {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.bump = [*ctx.bumps.get("config").unwrap()];
        config.authority = ctx.accounts.authority.key();
        Ok(())
    }

    pub fn mint(ctx: Context<MintToken>, amount: u64) -> Result<()> {
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(), 
                token::MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.dest_token_account.to_account_info(),
                    authority: ctx.accounts.config.to_account_info() },
                    &[&ctx.accounts.config.signer_seeds()]
                ), amount)
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(init, payer = authority, space = 8 + 32 + 1, seeds = [b"config-pda", authority.key().as_ref()], bump)]
    pub config: Account<'info, Config>,

    #[account(init, payer = authority, mint::decimals = 0, mint::authority = config)]
    pub mint: Account<'info, Mint>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct MintToken<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(seeds = [b"config-pda", authority.key().as_ref()], bump)]
    pub config: Account<'info, Config>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub dest_token_account: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[account]
pub struct Config {
    authority: Pubkey,
    bump: [u8;1]
}

impl Config {
    pub fn signer_seeds(&self) -> [&[u8]; 3] {
        [
            b"config-pda".as_ref(),
            self.authority.as_ref(),
            &self.bump,
        ]
    }
}
