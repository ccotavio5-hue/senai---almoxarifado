import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

// Endereço IP do seu servidor Flask
const API_URL = 'http://10.154.20.107:5000';

export default function AdicionarItemScreen({ navigation }: any) {
  const [item, setItem] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [descricao, setDescricao] = useState('');
  const [imagemUri, setImagemUri] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  // Função para selecionar imagem da galeria
  const selecionarImagem = async () => {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissao.granted) {
      Alert.alert('Permissão necessária', 'É preciso permitir o acesso às fotos.');
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!resultado.canceled && resultado.assets.length > 0) {
      setImagemUri(resultado.assets[0].uri);
    }
  };

  // Função para salvar o item na API
  const salvarItem = async () => {
    if (!item.trim() || !quantidade.trim()) {
      Alert.alert('Erro', 'Preencha o nome do item e a quantidade.');
      return;
    }

    setCarregando(true);

    try {
      const formData = new FormData();
      formData.append('item', item);
      formData.append('quantidade', quantidade);
      formData.append('descricao', descricao);

      // Se houver uma imagem selecionada, adiciona ao FormData
      if (imagemUri) {
        const nomeArquivo = imagemUri.split('/').pop() || 'foto.jpg';
        const extensao = nomeArquivo.split('.').pop();
        const tipo = extensao ? `image/${extensao}` : 'image/jpeg';

        formData.append('imagem', {
          uri: imagemUri,
          name: nomeArquivo,
          type: tipo,
        } as any);
      }

      // Envia a requisição POST (Sem definir Content-Type manual)
      const response = await fetch(`${API_URL}/api/adicionar`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.sucesso) {
        Alert.alert('Sucesso', 'Item adicionado/atualizado com sucesso!');
        setItem('');
        setQuantidade('');
        setDescricao('');
        setImagemUri(null);
      } else {
        Alert.alert('Erro', data.mensagem || data.erro || 'Erro ao adicionar item.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível conectar ao servidor. Verifique o IP e a conexão Wi-Fi');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>Adicionar Item</Text>

      <Text style={styles.label}>Nome do Item *</Text>
      <TextInput
        style={styles.input}
        value={item}
        onChangeText={setItem}
        placeholder="Ex: Chave de Fenda"
      />

      <Text style={styles.label}>Quantidade *</Text>
      <TextInput
        style={styles.input}
        value={quantidade}
        onChangeText={setQuantidade}
        keyboardType="numeric"
        placeholder="Ex: 10"
      />

      <Text style={styles.label}>Descrição</Text>
      <TextInput
        style={[styles.input, styles.inputMultiline]}
        value={descricao}
        onChangeText={setDescricao}
        placeholder="Descrição do item..."
        multiline
      />

      <Text style={styles.label}>Foto do Produto</Text>
      <TouchableOpacity style={styles.btnFoto} onPress={selecionarImagem}>
        <Text style={styles.btnFotoTexto}>
          {imagemUri ? 'Trocar Imagem' : 'Selecionar Foto'}
        </Text>
      </TouchableOpacity>

      {imagemUri && (
        <Image source={{ uri: imagemUri }} style={styles.previewImagem} />
      )}

      <TouchableOpacity
        style={[styles.btnSalvar, carregando && styles.btnDesabilitado]}
        onPress={salvarItem}
        disabled={carregando}
      >
        {carregando ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.btnSalvarTexto}>Salvar Item</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    flexGrow: 1,
  },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  inputMultiline: {
    height: 80,
    textAlignVertical: 'top',
  },
  btnFoto: {
    backgroundColor: '#6c757d',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  btnFotoTexto: {
    color: '#fff',
    fontWeight: 'bold',
  },
  previewImagem: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 15,
    resizeMode: 'cover',
  },
  btnSalvar: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  btnDesabilitado: {
    backgroundColor: '#a0c4ff',
  },
  btnSalvarTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});