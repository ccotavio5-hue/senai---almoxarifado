import bcrypt
from flask import Flask, render_template, request, redirect, session, jsonify
import mysql.connector

app = Flask(__name__)
app.secret_key = 'sua_chave_secreta'

def conectar():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="",
        database="tcc"
    )

@app.route('/verificar_adm', methods=['POST'])
def verificar_adm():
    dados = request.get_json()
    USUARIO_ADM = 'admin'
    SENHA_ADM = 'cenai'

    if dados['usuario'] == USUARIO_ADM and dados['senha'] == SENHA_ADM:
        session['adm_verificado'] = True
        return jsonify({'sucesso': True})
    else:
        return jsonify({'sucesso': False})

@app.route('/')
def login():
    return render_template("login.html")

@app.route('/criarconta.html')
def criarconta():
    if not session.get('adm_verificado'):
        return redirect('/')
    return render_template("criarconta.html")

@app.route('/login', methods=['POST'])
def fazer_login():
    dados = request.get_json()
    usuario = dados['usuario']
    senha = dados['senha'].encode('utf-8')

    conn = conectar()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM usuarios WHERE usuario = %s", (usuario,))
    user = cursor.fetchone()
    conn.close()

    if user and bcrypt.checkpw(senha, user[2].encode('utf-8')):
        session['usuario'] = user[1]
        session['tipo'] = user[3]
        return jsonify({'sucesso': True, 'redirect': '/estoque.html'})
    else:
        return jsonify({'sucesso': False})

@app.route('/criarconta', methods=['POST'])
def salvar_conta():
    usuario = request.form['usuario']
    senha = request.form['senha'].encode('utf-8')
    hash_senha = bcrypt.hashpw(senha, bcrypt.gensalt()).decode('utf-8')

    conn = conectar()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO usuarios (usuario, senha, tipo) VALUES (%s, %s, 'adm')", (usuario, hash_senha))
    conn.commit()
    conn.close()

    return redirect('/')

@app.route('/estoque.html')
def estoque():
    conexao = conectar()
    cursor = conexao.cursor()
    cursor.execute("SELECT * FROM estoque")
    produto = cursor.fetchall()
    conexao.close()
    return render_template("estoque.html", produto=produto)

@app.route('/retirados.html')
def retirados():
    conexao = conectar()
    cursor = conexao.cursor()
    cursor.execute("SELECT item, quantidade, pessoa, data_hora FROM historico")
    historico = cursor.fetchall()
    cursor.close()
    conexao.close()
    return render_template("retirados.html", historico=historico)

@app.route('/adicionar.html', methods=['GET', 'POST'])
def adicionar():
    if request.method == 'POST':
        conexao = conectar()
        cursor = conexao.cursor()

        item = request.form['item']
        quantidade = request.form['quantidade']
        descricao = request.form['descricao']

        cursor.execute("SELECT id FROM estoque WHERE item = %s", (item,))
        existe = cursor.fetchone()

        if existe:
            cursor.execute("UPDATE estoque SET quantidade = quantidade + %s WHERE item = %s", (quantidade, item))
        else:
            cursor.execute("INSERT INTO estoque (item, descricao, quantidade) VALUES (%s, %s, %s)", (item, descricao, quantidade))

        conexao.commit()
        cursor.close()
        conexao.close()
        return redirect('/estoque.html')

    return render_template("adicionar.html")



@app.route('/retirar.html', methods=['GET', 'POST'])
def retirar():
    if request.method == 'POST':
        conexao = conectar()
        cursor = conexao.cursor()

        item_nome = request.form['id']
        quantidade = int(request.form['quantidade'])
        pessoa = request.form['pessoa']

        # Atualiza o estoque pelo nome do item
        cursor.execute("""
            UPDATE estoque
            SET quantidade = quantidade - %s
            WHERE item = %s
        """, (quantidade, item_nome))

        # Salva no histórico
        cursor.execute("""
            INSERT INTO historico (item, quantidade, pessoa)
            VALUES (%s, %s, %s)
        """, (item_nome, quantidade, pessoa))

        conexao.commit()
        cursor.close()
        conexao.close()
        return redirect('/estoque.html')

    return render_template("retirar.html")

@app.route('/devolver.html')
def devolver():
    return render_template("devolver.html")

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)