async function verificarLogin() {
    const usuario = document.getElementById('usuario').value;
    const senha = document.getElementById('senha').value;

    if (!usuario || !senha) {
        Swal.fire({
            icon: 'warning',
            title: 'Atenção!',
            text: 'Preencha todos os campos!',
        });
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
        Swal.fire({
            icon: 'error',
            title: 'Erro!',
            text: 'Usuário ou senha incorretos!',
        });
    }
}

function verificarAdm() {
    const usuario = document.getElementById('usuario').value;
    const senha = document.getElementById('senha').value;

    if (!usuario || !senha) {
        Swal.fire({
            icon: 'warning',
            title: 'Atenção!',
            text: 'Preencha o usuário e a senha antes de acessar o cadastro ADM!',
        });
        return;
    }

    fetch('/verificar_adm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, senha })
    })
    .then(res => res.json())
    .then(dados => {
        if (dados.sucesso) {
            window.location.href = '/criarconta.html';
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Acesso Negado!',
                text: 'Você não tem permissão para criar contas!',
            });
        }
    });
}