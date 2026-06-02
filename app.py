from flask import Flask, render_template, request, redirect, session, jsonify
from werkzeug.utils import secure_filename
import mysql.connector
import os
import bcrypt

app = Flask(__name__)
app.secret_key = 'senha_super_secreta'


def gerar_hash(senha):
    return bcrypt.hashpw(senha.encode(), bcrypt.gensalt()).decode()

def verificar_senha(senha, hash_salvo):
    return bcrypt.checkpw(senha.encode(), hash_salvo.encode())


def banco():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="1234",
        database="tcc"
    )

# ========== PÁGINAS ==========

@app.route('/')
def login():
    return render_template("login.html")

@app.route('/criarconta.html')
def criarconta():
    if not session.get('adm_verificado'):
        return redirect('/')
    return render_template("criarconta.html")

@app.route('/estoque.html')
def estoque():
    conexao = banco()
    cursor = conexao.cursor()
    cursor.execute("SELECT id, item, descricao, quantidade, imagem FROM estoque")
    produto = cursor.fetchall()
    cursor.close()
    conexao.close()
    return render_template("estoque.html", produto=produto)

@app.route('/adicionar.html')
def adicionar():
    return render_template("adicionar.html")

@app.route('/retirar.html')
def retirar():
    return render_template("retirar.html")

@app.route('/retirados.html')
def retirados():
    conexao = banco()
    cursor = conexao.cursor()
    cursor.execute("SELECT item, quantidade, pessoa, data_hora FROM historico")
    historico = cursor.fetchall()
    cursor.close()
    conexao.close()
    return render_template("retirados.html", historico=historico)

@app.route('/devolver.html')
def devolver():
    return render_template("devolver.html")

# ========== LOGIN ==========

@app.route('/login', methods=['POST'])
def fazer_login():
    dados = request.get_json()
    usuario = dados['usuario']
    senha = dados['senha']

    conexao = banco()
    cursor = conexao.cursor()

    cursor.execute("SELECT id, usuario, senha FROM administrador WHERE usuario = %s", (usuario,))
    adm = cursor.fetchone()

    if adm and verificar_senha(senha, adm[2]):
        session['usuario'] = usuario
        session['tipo'] = 'adm'
        cursor.close()
        conexao.close()
        return jsonify({'sucesso': True, 'redirect': '/estoque.html'})

    cursor.execute("SELECT id, usuario, senha FROM usuario WHERE usuario = %s", (usuario,))
    user = cursor.fetchone()

    cursor.close()
    conexao.close()

    if user and verificar_senha(senha, user[2]):
        session['usuario'] = usuario
        session['tipo'] = 'user'
        return jsonify({'sucesso': True, 'redirect': '/estoque.html'})

    return jsonify({
        'sucesso': False,
        'alerta': {
            'icon': 'error',
            'titulo': 'Erro!',
            'texto': 'Usuário ou senha incorretos!'
        }
    })

# ========== ADM ==========

@app.route('/adm', methods=['POST'])
def adm():
    dados = request.get_json()

    usuario = dados['usuario']
    senha = dados['senha']

    conexao = banco()
    cursor = conexao.cursor()

    cursor.execute(
        "SELECT id, usuario, senha FROM administrador WHERE usuario = %s",
        (usuario,)
    )

    adm = cursor.fetchone()

    cursor.close()
    conexao.close()

    if adm and bcrypt.checkpw(
        senha.encode(),
        adm[2].encode()
    ):
        session['adm_verificado'] = True
        return jsonify({'sucesso': True})

    return jsonify({
        'sucesso': False,
        'alerta': {
            'icon': 'error',
            'titulo': 'Acesso Negado!',
            'texto': 'Usuário ou senha inválidos!'
        }
    })

# ========== CRIAR CONTA ==========

@app.route('/criarconta', methods=['POST'])
def salvar_conta():
    usuario = request.form['usuario']
    senha = request.form['senha']
    senha_hash = gerar_hash(senha)

    conexao = banco()
    cursor = conexao.cursor()
    cursor.execute("SELECT id FROM usuario WHERE usuario = %s", (usuario,))
    existente = cursor.fetchone()

    if existente:
        cursor.close()
        conexao.close()
        return """
        <script>
            alert("Usuário já cadastrado!");
            window.location.href = "/criarconta.html";
        </script>
        """

    cursor.execute("INSERT INTO usuario (usuario, senha) VALUES (%s, %s)", (usuario, senha_hash))
    conexao.commit()
    cursor.close()
    conexao.close()

    return """
    <script>
        alert("Conta criada com sucesso!");
        window.location.href = "/";
    </script>
    """

# ========== ADICIONAR ITEM ==========

@app.route('/adicionar', methods=['POST'])
def salvar_item():
    item = request.form['item']
    quantidade = int(request.form['quantidade'])
    descricao = request.form['descricao']

    arquivo = request.files['imagem']
    nome_arquivo = secure_filename(arquivo.filename)

    pasta = os.path.join('static', 'uploads')
    if not os.path.exists(pasta):
        os.makedirs(pasta)

    arquivo_path = os.path.join(pasta, nome_arquivo)
    arquivo.save(arquivo_path)

    conexao = banco()
    cursor = conexao.cursor()

    cursor.execute("SELECT id FROM estoque WHERE item = %s", (item,))
    existe = cursor.fetchone()

    if existe:
        cursor.execute(
            "UPDATE estoque SET quantidade = quantidade + %s WHERE item = %s",
            (quantidade, item)
        )
    else:
        cursor.execute(
            "INSERT INTO estoque (item, descricao, quantidade, imagem) VALUES (%s, %s, %s, %s)",
            (item, descricao, quantidade, nome_arquivo)
        )

    conexao.commit()
    cursor.close()
    conexao.close()

    return """
    <script>
        alert('Item adicionado com sucesso!');
        window.location.href='/estoque.html';
    </script>
    """

# ========== RETIRAR ITEM ==========

@app.route('/retirar', methods=['POST'])
def salvar_retirada():
    item = request.form['id']
    quantidade = int(request.form['quantidade'])
    pessoa = request.form['pessoa']

    conexao = banco()
    cursor = conexao.cursor()
    cursor.execute("UPDATE estoque SET quantidade = quantidade - %s WHERE item = %s", (quantidade, item))
    cursor.execute("INSERT INTO historico (item, quantidade, pessoa) VALUES (%s, %s, %s)", (item, quantidade, pessoa))
    conexao.commit()
    cursor.close()
    conexao.close()

    return """
    <script>
        alert("Item retirado com sucesso!");
        window.location.href = "/estoque.html";
    </script>
    """

# ========== INICIAR ==========

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True)