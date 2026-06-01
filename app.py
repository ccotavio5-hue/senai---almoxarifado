from flask import Flask, render_template, request
import mysql.connector

app = Flask(__name__)

@app.route('/')
def login():
    return render_template("login.html")

@app.route('/criarconta.html')
def criarconta():
    return render_template("criarconta.html")

@app.route('/estoque.html')
def estoque():
    
    connexao = mysql.connector.connect(
        host="localhost",
        user="root",
        password="1234",
        database="tcc"
    )
    cursor = connexao.cursor()
    
    cursor.execute("SELECT * FROM estoque")

    produto = cursor.fetchall()

    return render_template(
        "estoque.html",
        produto=produto
    )

@app.route('/retirados.html')
def retirados():
    conexao = mysql.connector.connect(
        host="localhost",
        user="root",
        password="1234",
        database="tcc"
    )
    cursor = conexao.cursor()
    cursor.execute("SELECT item, quantidade, pessoa, data_hora FROM historico")
    historico = cursor.fetchall()
    cursor.close()
    conexao.close()
    return render_template("retirados.html", historico=historico)



@app.route('/adicionar.html', methods=['GET', 'POST'])
def adicionar():
    if request.method == 'POST':
        conexao = mysql.connector.connect(
            host="localhost",
            user="root",
            password="1234",
            database="tcc"
        )
        cursor = conexao.cursor()
        
        item = request.form['item']
        quantidade = request.form['quantidade']
        descricao = request.form['descricao']

        # Verifica se o item já existe
        cursor.execute("SELECT id FROM estoque WHERE item = %s", (item,))
        resultado = cursor.fetchone()

        if resultado:
            # Item já existe, soma a quantidade
            cursor.execute("""
                UPDATE estoque 
                SET quantidade = quantidade + %s 
                WHERE item = %s
            """, (quantidade, item))
        else:
            # Item novo, insere
            cursor.execute("""
                INSERT INTO estoque (item, descricao,quantidade) 
                VALUES (%s, %s, %s)
            """, (item, descricao, quantidade))

        conexao.commit()
        cursor.close()
        conexao.close()

    return render_template("adicionar.html")



@app.route('/retirar.html', methods=['GET', 'POST'])
def retirar():
    if request.method == 'POST':
        conexao = mysql.connector.connect(
            host="localhost",
            user="root",
            password="1234",
            database="tcc"
        )
        cursor = conexao.cursor()

        item_id = request.form['id']
        quantidade = int(request.form['quantidade'])
        pessoa = request.form['pessoa']

        # Atualiza o estoque
        cursor.execute("""
            UPDATE estoque 
            SET quantidade = quantidade - %s 
            WHERE id = %s
        """, (quantidade, item_id))

        # Salva no histórico
        cursor.execute("""
            INSERT INTO historico (item, quantidade, pessoa)
            SELECT item, %s, %s FROM estoque WHERE id = %s
        """, (quantidade, pessoa, item_id))

        conexao.commit()
        cursor.close()
        conexao.close()

    return render_template("retirar.html")

@app.route('/devolver.html')
def devolver():
    return render_template("devolver.html")

if __name__== '__main__':
    app.run(host='0.0.0.0', debug=True)     