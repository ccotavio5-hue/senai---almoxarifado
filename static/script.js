function verImagem(imagem){
    Swal.fire({
        imageUrl: '/static/uploads/' + imagem,
        imageWidth: 400,
        imageHeight: 300,
        confirmButtonText: 'Fechar'
    });
}