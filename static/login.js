// Função genérica para mostrar alertas vindos do Flask
function mostrarAlerta(alerta) {
    Swal.fire({
        icon: alerta.icon,
        title: alerta.titulo,
        text: alerta.texto
    });
}

// ==================== LOGIN ====================

async function verificarLogin() {
    const usuario = document.getElementById('usuario').value;
    const senha = document.getElementById('senha').value;

    if (!usuario || !senha) {
        mostrarAlerta({ icon: 'warning', titulo: 'Atenção!', texto: 'Preencha todos os campos!' });
        return;
    }

    const resposta = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, senha })
    });

    const dados = await resposta.json();

    if (dados.sucesso) {
        window.location.href = dados.redirect;
    } else {
        mostrarAlerta(dados.alerta);
    }
}

// ==================== ADM ====================

async function verificarAdm() {
    const usuario = document.getElementById('usuario').value;
    const senha = document.getElementById('senha').value;

    if (!usuario || !senha) {
        mostrarAlerta({ icon: 'warning', titulo: 'Atenção!', texto: 'Preencha o usuário e a senha antes de acessar o cadastro ADM!' });
        return;
    }

    const resposta = await fetch('/adm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, senha })
    });

    const dados = await resposta.json();

    if (dados.sucesso) {
        window.location.href = '/criarconta.html';
    } else {
        mostrarAlerta(dados.alerta);
    }
}