import bcrypt

usuario = "roger"
senha = "senhaloka"

hash_senha = bcrypt.hashpw(
    senha.encode(),
    bcrypt.gensalt()
).decode()

print("Usuário:", usuario)
print("Hash:", hash_senha)