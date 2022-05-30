import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import {
  createAccount,
  createAssociatedTokenAccount,
  createAssociatedTokenAccountInstruction,
  createInitializeAccountInstruction,
  getAccount,
  getAssociatedTokenAddress,
  getMint,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { assert, expect } from "chai";
import { PdaPlayground } from "../target/types/pda_playground";

describe("pda_playground", async () => {
  const provider = anchor.AnchorProvider.env();
  // Configure the client to use the local cluster.
  anchor.setProvider(provider);

  const program = anchor.workspace.PdaPlayground as Program<PdaPlayground>;

  it("test", async () => {
    const TOKEN_AMOUNT = 100;
    const [config] = await anchor.web3.PublicKey.findProgramAddress([anchor.utils.bytes.utf8.encode("config-pda"), provider.wallet.publicKey.toBuffer()], program.programId);

    const mint = anchor.web3.Keypair.generate();
    console.log("mint: " + mint.publicKey);

    const tx1 = await program.methods
      .initialize()
      .accounts({
        authority: provider.wallet.publicKey,
        payer: provider.wallet.publicKey,
        config,
        mint: mint.publicKey,
      })
      .signers([mint])
      .rpc();
    console.log("tx1: " + tx1);

    expect((await program.account.config.fetch(config)).authority.toBase58()).to.equal(provider.wallet.publicKey.toBase58());

    const mintInfo = await getMint(provider.connection, mint.publicKey);
    expect(mintInfo.decimals).to.equal(0);
    expect(mintInfo.mintAuthority.toBase58()).to.equal(config.toBase58());

    const tokenOwner = anchor.web3.Keypair.generate();
    const destTokenAccount = await getAssociatedTokenAddress(mint.publicKey, tokenOwner.publicKey);
    await provider.sendAll([
      {
        tx: new anchor.web3.Transaction().add(createAssociatedTokenAccountInstruction(provider.wallet.publicKey, destTokenAccount, tokenOwner.publicKey, mint.publicKey)),
      },
    ]);

    const tx2 = await program.methods
      .mint(new anchor.BN(TOKEN_AMOUNT))
      .accounts({
        authority: provider.wallet.publicKey,
        config,
        mint: mint.publicKey,
        destTokenAccount,
      })
      .rpc();
    console.log("tx2: " + tx2);

    const tokenAccountInfo = await getAccount(provider.connection, destTokenAccount);
    assert.isTrue(Number(tokenAccountInfo.amount) == TOKEN_AMOUNT, "token amount as expected");
  });
});
