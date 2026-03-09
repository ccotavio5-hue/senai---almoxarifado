from flask import Flask
from flask import render_template

app = Flask(__name__)

@app.route('/')
def login():
    return render_template("login.html")

@app.route('/estoque.html')
def estoque():
    return render_template("estoque.html")

@app.route('/retirados.html')
def retirados():
    return render_template("retirados.html")

@app.route('/adicionar.html')
def adicionar():
    return render_template("adicionar.html")

@app.route('/retirar.html')
def retirar():
    return render_template("retirar.html")

@app.route('/devolver.html')
def devolver():
    return render_template("devolver.html")

if __name__== '__main__':
    app.run(host='0.0.0.0', debug=True)     