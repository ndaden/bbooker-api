async function hashPassword(clearPassword: string): Promise<{ hash: string }> {
  return Promise.resolve({
    hash: await Bun.password.hash(clearPassword, "argon2d"),
  });
}

async function comparePassword(
  inputPassword: string,
  hash: string
): Promise<boolean> {
  return Promise.resolve(
    await Bun.password.verify(inputPassword, hash, "argon2d")
  );
}

function sha256hash(text: string) {
  return Bun.password.hashSync(text, "argon2d");
}

export { hashPassword, comparePassword, sha256hash };
