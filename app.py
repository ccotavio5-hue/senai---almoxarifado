from flask import Flask, render_template, request, redirect, session, jsonify
from werkzeug.utils import secure_filename
import mysql.connector
import os
import bcrypt
import csv


app = Flask(__name__)

# Chave da sessão
app.secret_key = os.getenv("SECRET_KEY", "senha_super_secreta")


# Configuração do banco de dados
conexao = {
    "host": os.getenv("DB_HOST", "mysql"),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "tcc")
}


def conectar():
    return mysql.connector.connect(**conexao)


# =========================================================
# PÁGINA DE LOGIN
# =========================================================

@app.route('/')
def login():
    return render_template("login.html")


@app.route('/login', methods=['POST'])
def fazer_login():

    dados = request.get_json()

    usuario = dados['usuario']
    senha = dados['senha']

    conexao = conectar()
    cursor = conexao.cursor()

    # Primeiro verifica se é administrador
    cursor.execute(
        "SELECT id, usuario, senha FROM administrador WHERE usuario = %s",
        (usuario,)
    )

    adm = cursor.fetchone()

    if adm:
        senha_certa = bcrypt.checkpw(
            senha.encode(),
            adm[2].encode()
        )

        if senha_certa:
            session['usuario'] = usuario
            session['tipo'] = 'adm'

            cursor.close()
            conexao.close()

            return jsonify({
                'sucesso': True,
                'redirect': '/estoque.html'
            })

    # Se não for administrador, verifica se é usuário
    cursor.execute(
        "SELECT id, usuario, senha FROM usuario WHERE usuario = %s",
        (usuario,)
    )

    user = cursor.fetchone()

    cursor.close()
    conexao.close()

    if user:
        senha_certa = bcrypt.checkpw(
            senha.encode(),
            user[2].encode()
        )

        if senha_certa:
            session['usuario'] = usuario
            session['tipo'] = 'user'

            return jsonify({
                'sucesso': True,
                'redirect': '/estoque.html'
            })

    return jsonify({
        'sucesso': False,
        'alerta': {
            'icon': 'error',
            'titulo': 'Erro!',
            'texto': 'Usuário ou senha incorretos!'
        }
    })


# =========================================================
# VERIFICA SE É ADMINISTRADOR
# =========================================================

@app.route('/adm', methods=['POST'])
def adm():

    dados = request.get_json()

    usuario = dados['usuario']
    senha = dados['senha']

    conexao = conectar()
    cursor = conexao.cursor()

    cursor.execute(
        "SELECT id, usuario, senha FROM administrador WHERE usuario = %s",
        (usuario,)
    )

    administrador = cursor.fetchone()

    cursor.close()
    conexao.close()

    if administrador:

        senha_certa = bcrypt.checkpw(
            senha.encode(),
            administrador[2].encode()
        )

        if senha_certa:
            session['adm_verificado'] = True

            return jsonify({
                'sucesso': True
            })

    return jsonify({
        'sucesso': False,
        'alerta': {
            'icon': 'error',
            'titulo': 'Acesso Negado!',
            'texto': 'Usuário ou senha inválidos!'
        }
    })


# =========================================================
# CRIAR CONTA
# =========================================================

@app.route('/criarconta.html')
def criarconta():

    if not session.get('adm_verificado'):
        return redirect('/')

    return render_template("criarconta.html")


@app.route('/criarconta', methods=['POST'])
def salvar_conta():

    usuario = request.form['usuario']
    senha = request.form['senha']

    # Criptografa a senha antes de salvar
    senha_hash = bcrypt.hashpw(
        senha.encode(),
        bcrypt.gensalt()
    ).decode()

    conexao = conectar()
    cursor = conexao.cursor()

    cursor.execute(
        "SELECT id FROM usuario WHERE usuario = %s",
        (usuario,)
    )

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

    cursor.execute(
        "INSERT INTO usuario (usuario, senha) VALUES (%s, %s)",
        (usuario, senha_hash)
    )

    conexao.commit()

    cursor.close()
    conexao.close()

    return """
    <script>
        alert("Conta criada com sucesso!");
        window.location.href = "/";
    </script>
    """


# =========================================================
# ESTOQUE
# =========================================================

@app.route('/estoque.html')
def estoque():

    conexao = conectar()
    cursor = conexao.cursor()

    cursor.execute(
        "SELECT id, item, descricao, quantidade, imagem FROM estoque"
    )

    produto = cursor.fetchall()

    cursor.close()
    conexao.close()

    return render_template(
        "estoque.html",
        produto=produto
    )


# =========================================================
# ADICIONAR ITEM
# =========================================================

@app.route('/adicionar.html')
def adicionar():
    return render_template("adicionar.html")


@app.route('/adicionar', methods=['POST'])
def salvar_item():

    item = request.form['item']
    quantidade = int(request.form['quantidade'])
    descricao = request.form['descricao']

    arquivo = request.files['imagem']
    nome_arquivo = secure_filename(arquivo.filename)

    # Cria a pasta de uploads
    pasta = os.path.join('static', 'uploads')

    if not os.path.exists(pasta):
        os.makedirs(pasta)

    caminho_arquivo = os.path.join(
        pasta,
        nome_arquivo
    )

    arquivo.save(caminho_arquivo)

    conexao = conectar()
    cursor = conexao.cursor()

    # Verifica se o item já existe
    cursor.execute(
        "SELECT id FROM estoque WHERE item = %s",
        (item,)
    )

    existe = cursor.fetchone()

    if existe:

        # Se já existe, soma a quantidade
        cursor.execute(
            """
            UPDATE estoque
            SET quantidade = quantidade + %s
            WHERE item = %s
            """,
            (quantidade, item)
        )

    else:

        # Se não existe, cria um novo item
        cursor.execute(
            """
            INSERT INTO estoque
            (item, descricao, quantidade, imagem)
            VALUES (%s, %s, %s, %s)
            """,
            (
                item,
                descricao,
                quantidade,
                nome_arquivo
            )
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


# =========================================================
# RETIRAR ITEM DO ESTOQUE
# =========================================================

@app.route('/retirar.html')
def retirar():
    return render_template("retirar.html")


@app.route('/retirar', methods=['POST'])
def salvar_retirada():

    item_id = request.form['id']
    quantidade = int(request.form['quantidade'])
    pessoa = request.form['pessoa']

    conexao = conectar()
    cursor = conexao.cursor()

    cursor.execute(
        "SELECT item FROM estoque WHERE id = %s",
        (item_id,)
    )

    resultado = cursor.fetchone()

    if resultado is None:

        cursor.close()
        conexao.close()

        return """
        <script>
            alert("Item não encontrado!");
            window.location.href = "/retirar.html";
        </script>
        """

    nome_item = resultado[0]

    cursor.execute(
        """
        UPDATE estoque
        SET quantidade = quantidade - %s
        WHERE id = %s
        """,
        (quantidade, item_id)
    )

    cursor.execute(
        """
        INSERT INTO historico
        (item, quantidade, pessoa)
        VALUES (%s, %s, %s)
        """,
        (
            nome_item,
            quantidade,
            pessoa
        )
    )

    conexao.commit()

    cursor.close()
    conexao.close()

    return """
    <script>
        alert("Item retirado com sucesso!");
        window.location.href = "/estoque.html";
    </script>
    """


# =========================================================
# HISTÓRICO DE RETIRADAS
# =========================================================

@app.route('/retirados.html')
def retirados():

    conexao = conectar()
    cursor = conexao.cursor()

    cursor.execute(
        """
        SELECT item, quantidade, pessoa, data_hora
        FROM historico
        """
    )

    historico = cursor.fetchall()

    cursor.close()
    conexao.close()

    return render_template(
        "retirados.html",
        historico=historico
    )


# =========================================================
# IMPORTAR CSV
# =========================================================

@app.route('/importarcsv', methods=['POST'])
def importar_csv():

    arquivo = request.files['arquivo']

    conexao = conectar()
    cursor = conexao.cursor()

    leitor = csv.reader(
        arquivo.stream
        .read()
        .decode("utf-8")
        .splitlines()
    )

    # Ignora o cabeçalho
    next(leitor)

    for linha in leitor:

        item = linha[0]
        descricao = linha[1]
        quantidade = int(linha[2])
        imagem = linha[3]

        cursor.execute(
            """
            INSERT INTO estoque
            (item, descricao, quantidade, imagem)
            VALUES (%s, %s, %s, %s)
            """,
            (
                item,
                descricao,
                quantidade,
                imagem
            )
        )

    conexao.commit()

    cursor.close()
    conexao.close()

    return """
    <script>
        alert("CSV importado com sucesso!");
        window.location.href="/estoque.html";
    </script>
    """


# =========================================================
# EXCLUIR ESTOQUE
# =========================================================

@app.route('/excluirtabela', methods=['POST'])
def apagar_estoque():

    conexao = conectar()
    cursor = conexao.cursor()

    cursor.execute("DELETE FROM estoque")

    conexao.commit()

    cursor.close()
    conexao.close()

    return """
    <script>
        alert("Estoque apagado com sucesso!");
        window.location.href="/estoque.html";
    </script>
    """


# =========================================================
# INICIAR SERVIDOR
# =========================================================

if __name__ == '__main__':
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True
    )