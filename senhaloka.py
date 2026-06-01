import bcrypt

senha = b"otavio"  
hash = bcrypt.hashpw(senha, bcrypt.gensalt()).decode()
print(hash)