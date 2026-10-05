from flask import Flask, render_template, request, redirect, session, jsonify, Response
from werkzeug.utils import secure_filename
from flask_cors import CORS
import mysql.connector
import os
import bcrypt
import csv


app = Flask(__name__)

# Chave da sessão
app.secret_key = os.getenv("SECRET_KEY", "senha_super_secreta")

# Configuração do banco de dados

conexao = {
    "host": os.getenv("DB_HOST", "localhost"),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", "1234"),
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
    arquivo = request.files.get('arquivo')
    
    if not arquivo:
        return """
        <script>
            alert("Nenhum arquivo enviado!");
            window.location.href="/estoque.html";
        </script>
        """

    # Lê o conteúdo do arquivo
    conteudo_texto = arquivo.stream.read().decode("utf-8")
    
    # Detecta automaticamente se o CSV usa ';' ou ',' como separador
    separador = ';' if ';' in conteudo_texto else ','
    
    conteudo = conteudo_texto.splitlines()
    leitor = csv.reader(conteudo, delimiter=separador)

    # Ignora a primeira linha (cabeçalho)
    next(leitor, None)

    conexao = conectar()
    cursor = conexao.cursor()

    for linha in leitor:
        # Pula linhas vazias
        if not linha:
            continue

        item = linha[0] if len(linha) > 0 else ''
        descricao = linha[1] if len(linha) > 1 else ''
        
        # Converte a quantidade com segurança
        try:
            quantidade = int(linha[2]) if len(linha) > 2 else 0
        except ValueError:
            quantidade = 0

        imagem = linha[3] if len(linha) > 3 else ''

        # Insere se tiver pelo menos o nome do item
        if item:
            cursor.execute(
                """
                INSERT INTO estoque (item, descricao, quantidade, imagem)
                VALUES (%s, %s, %s, %s)
                """,
                (item, descricao, quantidade, imagem)
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
# EXPORTAR CSV
# =========================================================


@app.route('/exportarcsv')
def exportar_csv():
    conexao = conectar()
    cursor = conexao.cursor()

    cursor.execute("SELECT id, item, descricao, quantidade FROM estoque")
    produtos = cursor.fetchall()

    cursor.close()
    conexao.close()

    # Cabeçalho com UTF-8 BOM (\ufeff) para abrir correto no Excel
    conteudo_csv = "\ufeffID;Item;Descrição;Quantidade\n"
    
    for prod in produtos:
        # Trata os textos para evitar quebrar o CSV se tiver aspas
        item = str(prod[1]).replace('"', '""')
        descricao = str(prod[2]).replace('"', '""')
        
        conteudo_csv += f'{prod[0]};"{item}";"{descricao}";{prod[3]}\n'

    resposta = Response(conteudo_csv, mimetype='text/csv')
    resposta.headers["Content-Disposition"] = "attachment; filename=estoque.csv"
    
    return resposta

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
# ROTA NOVA DO ESTOQUE
# =========================================================

@app.route('/api/produtos', methods=['GET'])
def api_listar_produtos():
    try:
        conexao = conectar()
        cursor = conexao.cursor(dictionary=True)
        
        cursor.execute("SELECT id, item, descricao, quantidade, imagem FROM estoque")
        produtos = cursor.fetchall()
        
        cursor.close()
        conexao.close()
        
        return jsonify({
            'sucesso': True,
            'total': len(produtos),
            'itens': produtos
        }), 200

    except Exception as e:
        return jsonify({
            'sucesso': False,
            'erro': str(e)
        }), 500
    

@app.route('/api/adicionar', methods=['POST'])
def api_adicionar_item():
    try:
        dados = request.get_json() or {}
        
        item = dados.get('item')
        quantidade = dados.get('quantidade')
        descricao = dados.get('descricao', '')
        imagem = dados.get('imagem', 'padrao.png')

        # Validação dos campos obrigatórios
        if not item or quantidade is None:
            return jsonify({
                'sucesso': False, 
                'mensagem': 'Os campos "item" e "quantidade" são obrigatórios!'
            }), 400

        conexao = conectar()
        cursor = conexao.cursor()

        # Verifica se o item já existe no banco
        cursor.execute("SELECT id FROM estoque WHERE item = %s", (item,))
        existe = cursor.fetchone()

        if existe:
            # Se existe, apenas soma a quantidade enviada
            cursor.execute(
                "UPDATE estoque SET quantidade = quantidade + %s WHERE item = %s", 
                (quantidade, item)
            )
        else:
            # Se não existe, insere o novo produto
            cursor.execute(
                "INSERT INTO estoque (item, descricao, quantidade, imagem) VALUES (%s, %s, %s, %s)",
                (item, descricao, quantidade, imagem)
            )

        conexao.commit()
        cursor.close()
        conexao.close()

        return jsonify({
            'sucesso': True, 
            'mensagem': 'Item cadastrado/atualizado com sucesso!'
        }), 201

    except Exception as e:
        return jsonify({
            'sucesso': False, 
            'erro': str(e)
        }), 500



@app.route('/api/retirar', methods=['DELETE'])
def api_retirar_simplificado():
    dados = request.get_json()

    item_id = dados['id']
    quantidade = int(dados['quantidade'])
    pessoa = dados['pessoa']

    conexao = conectar()
    cursor = conexao.cursor()

    # 1. Pega o nome e a quantidade atual do produto
    cursor.execute("SELECT item, quantidade FROM estoque WHERE id = %s", (item_id,))
    produto = cursor.fetchone()

    if not produto:
        cursor.close()
        conexao.close()
        return jsonify({'sucesso': False, 'mensagem': 'Item não encontrado!'}), 404

    nome_item, qtd_atual = produto

    # 2. Atualiza ou Deleta do estoque
    if qtd_atual <= quantidade:
        cursor.execute("DELETE FROM estoque WHERE id = %s", (item_id,))
    else:
        cursor.execute("UPDATE estoque SET quantidade = quantidade - %s WHERE id = %s", (quantidade, item_id))

    # 3. Salva no histórico
    cursor.execute(
        "INSERT INTO historico (item, quantidade, pessoa) VALUES (%s, %s, %s)",
        (nome_item, quantidade, pessoa)
    )

    conexao.commit()
    cursor.close()
    conexao.close()

    return jsonify({'sucesso': True, 'mensagem': 'Retirada realizada com sucesso!'}), 200



@app.route('/api/historico', methods=['GET'])
def api_listar_historico():
    conexao = conectar()
    cursor = conexao.cursor(dictionary=True)

    # Busca todos os registos do histórico ordenados pelos mais recentes
    cursor.execute(
        "SELECT id, item, quantidade, pessoa, data_hora FROM historico ORDER BY id DESC"
    )
    historico = cursor.fetchall()

    cursor.close()
    conexao.close()

    return jsonify({
        'sucesso': True,
        'total': len(historico),
        'historico': historico
    }), 200



@app.route('/api/adm', methods=['POST'])
def api_verificar_adm():
    dados = request.get_json()
    usuario = dados['usuario']
    senha = dados['senha']

    conexao = conectar()
    cursor = conexao.cursor(dictionary=True)

    cursor.execute("SELECT id, usuario, senha FROM administrador WHERE usuario = %s", (usuario,))
    adm = cursor.fetchone()

    cursor.close()
    conexao.close()

    if adm and bcrypt.checkpw(senha.encode(), adm['senha'].encode()):
        session['adm_verificado'] = True
        return jsonify({'sucesso': True, 'mensagem': 'Acesso de Administrador confirmado!'}), 200

    return jsonify({'sucesso': False, 'mensagem': 'Acesso Negado!'}), 401



@app.route('/api/criarconta', methods=['POST'])
def api_criar_conta():
    dados = request.get_json()

    usuario = dados['usuario']
    senha = dados['senha']

    conexao = conectar()
    cursor = conexao.cursor()

    # Verifica se o utilizador já existe
    cursor.execute("SELECT id FROM usuario WHERE usuario = %s", (usuario,))
    if cursor.fetchone():
        cursor.close()
        conexao.close()
        return jsonify({'sucesso': False, 'mensagem': 'Este nome de utilizador já existe!'}), 400

    # Criptografa a senha
    senha_hash = bcrypt.hashpw(senha.encode(), bcrypt.gensalt()).decode()

    # Regista o novo utilizador
    cursor.execute("INSERT INTO usuario (usuario, senha) VALUES (%s, %s)", (usuario, senha_hash))
    conexao.commit()

    cursor.close()
    conexao.close()

    return jsonify({'sucesso': True, 'mensagem': 'Conta criada com sucesso!'}), 201



@app.route('/api/login', methods=['POST'])
def api_login():
    dados = request.get_json()

    usuario = dados['usuario']
    senha = dados['senha']

    conexao = conectar()
    cursor = conexao.cursor(dictionary=True)

    # 1. Tenta encontrar no Administrador
    cursor.execute("SELECT id, usuario, senha FROM administrador WHERE usuario = %s", (usuario,))
    adm = cursor.fetchone()

    if adm and bcrypt.checkpw(senha.encode(), adm['senha'].encode()):
        session['usuario'] = usuario
        session['tipo'] = 'adm'
        cursor.close()
        conexao.close()
        return jsonify({'sucesso': True, 'mensagem': 'Login de Administrador efetuado!', 'tipo': 'adm'}), 200

    # 2. Tenta encontrar no Usuário comum
    cursor.execute("SELECT id, usuario, senha FROM usuario WHERE usuario = %s", (usuario,))
    user = cursor.fetchone()

    cursor.close()
    conexao.close()

    if user and bcrypt.checkpw(senha.encode(), user['senha'].encode()):
        session['usuario'] = usuario
        session['tipo'] = 'user'
        return jsonify({'sucesso': True, 'mensagem': 'Login de Utilizador efetuado!', 'tipo': 'user'}), 200

    return jsonify({'sucesso': False, 'mensagem': 'Utilizador ou senha incorretos!'}), 401


# =========================================================
# ROTAS ADICIONAIS DE AUTENTICAÇÃO / SESSÃO PARA O APP
# =========================================================

# Configuração de CORS atualizada para permitir o envio de sessão/cookies
CORS(app, supports_credentials=True)


@app.route('/api/me', methods=['GET'])
def api_obter_usuario_logado():
    """Retorna os dados do usuário atualmente logado na sessão."""
    usuario = session.get('usuario')
    tipo = session.get('tipo')

    if usuario:
        return jsonify({
            'sucesso': True,
            'logado': True,
            'usuario': usuario,
            'tipo': tipo
        }), 200

    return jsonify({
        'sucesso': False,
        'logado': False,
        'mensagem': 'Nenhum usuário logado na sessão.'
    }), 401


@app.route('/api/logout', methods=['POST'])
def api_logout():
    """Encerra a sessão do usuário no aplicativo."""
    session.clear()
    return jsonify({
        'sucesso': True,
        'mensagem': 'Logout realizado com sucesso!'
    }), 200


@app.route('/api/verificar-sessao-adm', methods=['GET'])
def api_verificar_sessao_adm():
    """Verifica se o usuário atual confirmou a credencial de Administrador."""
    if session.get('adm_verificado'):
        return jsonify({
            'sucesso': True,
            'adm_verificado': True
        }), 200

    return jsonify({
        'sucesso': False,
        'adm_verificado': False,
        'mensagem': 'Acesso restrito. Requer autenticação de administrador.'
    }), 403

# =========================================================
# INICIAR SERVIDOR
# =========================================================

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)