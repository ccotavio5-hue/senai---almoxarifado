from flask import Flask, render_template, request, redirect, session, jsonify, Response
from werkzeug.utils import secure_filename
from uuid import uuid4
from flask_cors import CORS
import mysql.connector
import os
import bcrypt
import csv


app = Flask(__name__)

# Chave da sessão
app.secret_key = os.getenv("SECRET_KEY", "senha_super_secreta")
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

# Configuração do banco de dados

conexao = {
    "host": os.getenv("DB_HOST", "localhost"),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", "1234"),
    "database": os.getenv("DB_NAME", "tcc")
}

def conectar():
    return mysql.connector.connect(**conexao)


@app.route('/ia.html')
def pagina_ia():
    return render_template('ia.html')
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
# EXPORTAR CSV
# =========================================================


@app.route('/exportarcsv')
def exportar_csv():
    conexao = conectar()
    cursor = conexao.cursor()

    cursor.execute(
        "SELECT id, item, descricao, quantidade, imagem FROM estoque"
    )
    produtos = cursor.fetchall()

    cursor.close()
    conexao.close()

    conteudo_csv = "\ufeffID;Item;Descrição;Quantidade;Imagem\n"

    for prod in produtos:
        item = str(prod[1] or '').replace('"', '""')
        descricao = str(prod[2] or '').replace('"', '""')
        imagem = str(prod[4] or '').replace('"', '""')

        conteudo_csv += (
            f'{prod[0]};"{item}";"{descricao}";{prod[3]};"{imagem}"\n'
        )

    resposta = Response(
        conteudo_csv,
        mimetype='text/csv; charset=utf-8'
    )

    resposta.headers["Content-Disposition"] = (
        "attachment; filename=estoque.csv"
    )

    return resposta

# =========================================================
# EXCLUIR ESTOQUE
# =========================================================

@app.route('/excluirtabela', methods=['POST'])
def apagar_estoque():

    if session.get('tipo') != 'adm':
            return """
            <script>
                alert("Acesso negado! Apenas administradores podem excluir o estoque.");
                window.location.href="/estoque.html";
            </script>
            """, 403

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

@app.route('/api/estoque', methods=['DELETE'])
def api_excluir_estoque():
    if session.get('tipo') != 'adm':
        return jsonify({
            'sucesso': False,
            'mensagem': 'Acesso de administrador necessário.'
        }), 403

    banco = conectar()
    cursor = banco.cursor()

    try:
        cursor.execute('DELETE FROM estoque')
        banco.commit()

        return jsonify({
            'sucesso': True,
            'mensagem': 'Estoque excluído com sucesso!'
        }), 200

    except Exception:
        banco.rollback()
        app.logger.exception('Erro ao excluir estoque')

        return jsonify({
            'sucesso': False,
            'mensagem': 'Erro ao excluir estoque.'
        }), 500

    finally:
        cursor.close()
        banco.close()
        


@app.route('/api/importar-csv', methods=['POST'])
def api_importar_csv_mobile():
    import io
    import unicodedata

    dados = request.get_json(silent=True) or {}
    texto = dados.get('csv')
    if not isinstance(texto, str) or not texto.strip():
        return jsonify(sucesso=False, mensagem='CSV vazio ou não enviado.'), 400

    def normalizar(valor):
        return ''.join(c for c in unicodedata.normalize('NFKD', valor or '')
                       if not unicodedata.combining(c)).strip().lower().lstrip('\ufeff')

    try:
        amostra = texto[:4096]
        delimitador = csv.Sniffer().sniff(amostra, delimiters=';,').delimiter
        leitor = csv.DictReader(io.StringIO(texto.lstrip('\ufeff')), delimiter=delimitador)
        campos = {normalizar(c): c for c in (leitor.fieldnames or [])}
        if 'item' not in campos or 'quantidade' not in campos:
            return jsonify(sucesso=False, mensagem='CSV precisa de Item e Quantidade.'), 400

        produtos = []
        for numero, linha in enumerate(leitor, 2):
            item = (linha.get(campos['item']) or '').strip()
            if not item:
                continue
            try:
                quantidade = int((linha.get(campos['quantidade']) or '').strip())
            except ValueError:
                return jsonify(sucesso=False, mensagem=f'Quantidade inválida na linha {numero}.'), 400
            if quantidade < 0:
                return jsonify(sucesso=False, mensagem=f'Quantidade negativa na linha {numero}.'), 400
            descricao = (linha.get(campos.get('descricao', ''), '') or '').strip()
            imagem = (linha.get(campos.get('imagem', campos.get('foto', '')), '') or '').strip()
            produtos.append((item, descricao, quantidade, imagem or 'padrao.png'))

        banco = conectar()
        cursor = banco.cursor()
        try:
            for item, descricao, quantidade, imagem in produtos:
                cursor.execute('SELECT id FROM estoque WHERE item = %s', (item,))
                existente = cursor.fetchone()
                if existente:
                    cursor.execute('UPDATE estoque SET quantidade = quantidade + %s WHERE id = %s',
                                   (quantidade, existente[0]))
                else:
                    cursor.execute('INSERT INTO estoque (item, descricao, quantidade, imagem) VALUES (%s, %s, %s, %s)',
                                   (item, descricao, quantidade, imagem))
            banco.commit()
        except Exception:
            banco.rollback()
            raise
        finally:
            cursor.close()
            banco.close()
        return jsonify(sucesso=True, importados=len(produtos), mensagem='CSV importado com sucesso!')
    except csv.Error:
        return jsonify(sucesso=False, mensagem='Formato CSV inválido.'), 400
    except Exception:
        app.logger.exception('Erro ao importar CSV')
        return jsonify(sucesso=False, mensagem='Erro ao importar CSV.'), 500


@app.route('/api/exportar-csv', methods=['GET'])
def api_exportar_csv():
    import io

    conexao = conectar()
    cursor = conexao.cursor()

    cursor.execute(
        "SELECT id, item, descricao, quantidade, imagem FROM estoque"
    )
    produtos = cursor.fetchall()

    cursor.close()
    conexao.close()

    arquivo = io.StringIO()
    arquivo.write('\ufeff')

    escritor = csv.writer(arquivo, delimiter=';')
    escritor.writerow(['ID', 'Item', 'Descrição', 'Quantidade', 'Imagem'])
    escritor.writerows(produtos)

    return Response(
        arquivo.getvalue(),
        mimetype='text/csv; charset=utf-8',
        headers={
            'Content-Disposition': 'attachment; filename=estoque.csv'
        }
    )


@app.route('/api/estoque', methods=['GET'])
def api_listar_produtos():
    try:
        conexao = conectar()
        cursor = conexao.cursor(dictionary=True)
        
        cursor.execute("SELECT id, item, descricao, quantidade, imagem FROM estoque")
        produtos = cursor.fetchall()
        
        cursor.close()
        conexao.close()

        # Retorna a chave 'estoque' exigida pela Home Screen do App
        return jsonify({
            'sucesso': True,
            'total': len(produtos),
            'estoque': produtos
        }), 200

    except Exception as e:
        return jsonify({
            'sucesso': False,
            'erro': str(e)
        }), 500
    

@app.route('/api/adicionar', methods=['POST'])
def api_adicionar_item():
    # Recebe texto e uma foto opcional por multipart/form-data.
    try:
        item = (request.form.get('item') or '').strip()
        descricao = (request.form.get('descricao') or '').strip()
        quantidade_texto = (request.form.get('quantidade') or '').strip()

        if not item or not quantidade_texto:
            return jsonify({
                'sucesso': False,
                'mensagem': 'Nome do item e quantidade são obrigatórios.'
            }), 400

        try:
            quantidade = int(quantidade_texto)
        except ValueError:
            return jsonify({
                'sucesso': False,
                'mensagem': 'A quantidade deve ser um número inteiro.'
            }), 400

        if quantidade <= 0:
            return jsonify({
                'sucesso': False,
                'mensagem': 'A quantidade deve ser maior que zero.'
            }), 400

        nome_arquivo = None
        arquivo = request.files.get('imagem')

        if arquivo and arquivo.filename:
            nome_original = secure_filename(arquivo.filename)
            extensao = os.path.splitext(nome_original)[1].lower()

            if extensao not in {'.jpg', '.jpeg', '.png', '.webp'}:
                return jsonify({
                    'sucesso': False,
                    'mensagem': 'Formato de foto não permitido. Use JPG, PNG ou WEBP.'
                }), 400

            # Evita sobrescrever imagens de outros produtos.
            nome_arquivo = f'{uuid4().hex}{extensao}'
            pasta = os.path.join(app.static_folder, 'uploads')
            os.makedirs(pasta, exist_ok=True)
            arquivo.save(os.path.join(pasta, nome_arquivo))

        banco = conectar()
        cursor = banco.cursor()
        try:
            cursor.execute('SELECT id FROM estoque WHERE item = %s', (item,))
            existente = cursor.fetchone()

            if existente:
                if nome_arquivo:
                    cursor.execute(
                        'UPDATE estoque SET quantidade = quantidade + %s, imagem = %s WHERE id = %s',
                        (quantidade, nome_arquivo, existente[0])
                    )
                else:
                    cursor.execute(
                        'UPDATE estoque SET quantidade = quantidade + %s WHERE id = %s',
                        (quantidade, existente[0])
                    )
            else:
                cursor.execute(
                    'INSERT INTO estoque (item, descricao, quantidade, imagem) VALUES (%s, %s, %s, %s)',
                    (item, descricao, quantidade, nome_arquivo or 'padrao.png')
                )

            banco.commit()
        except Exception:
            banco.rollback()
            raise
        finally:
            cursor.close()
            banco.close()

        return jsonify({
            'sucesso': True,
            'mensagem': 'Item cadastrado com sucesso!'
        }), 201

    except Exception:
        app.logger.exception('Erro ao adicionar produto')
        return jsonify({
            'sucesso': False,
            'mensagem': 'Erro interno ao cadastrar o produto.'
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
# INICIAR SERVIDOR
# =========================================================

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)