
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Image, Alert, ScrollView, ActivityIndicator, StatusBar
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { fetch } from 'expo/fetch';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const API_URL = 'http://192.168.4.2:5000';

const abas = [
  { nome: 'Estoque', rota: '/home' },
  { nome: 'Adicionar', rota: '/adicionar' },
  { nome: 'Retirar', rota: '/retirar' },
  { nome: 'Histórico', rota: '/historico' }
] as const;

export default function AdicionarItemScreen() {
  const router = useRouter();
  const [item, setItem] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [descricao, setDescricao] = useState('');
  const [imagemUri, setImagemUri] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const selecionarImagem = async () => {
    try {
      const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissao.granted) {
        Alert.alert('Atenção', 'Permita o acesso às fotos.');
        return;
      }

      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], allowsEditing: true,
        aspect: [4, 3], quality: 0.8
      });

      if (!resultado.canceled && resultado.assets.length)
        setImagemUri(resultado.assets[0].uri);
    } catch {
      Alert.alert('Erro', 'Não foi possível selecionar a imagem.');
    }
  };

  const salvarItem = async () => {
    const numero = Number(quantidade.trim());
    if (!item.trim() || !Number.isInteger(numero) || numero <= 0) {
      Alert.alert('Atenção', 'Informe o nome e uma quantidade válida.');
      return;
    }

    setCarregando(true);
    try {
      const dados = new FormData();
      dados.append('item', item.trim());
      dados.append('quantidade', String(numero));
      dados.append('descricao', descricao.trim());

      if (imagemUri) {
        const foto = new File(imagemUri);
        if (!foto.exists) throw new Error('Imagem não encontrada.');
        if (foto.size > 16 * 1024 * 1024)
          throw new Error('A imagem deve ter menos de 16 MB.');
        dados.append('imagem', foto, foto.name);
      }

      const resposta = await fetch(`${API_URL}/api/adicionar`, {
        method: 'POST', body: dados
      });

      const resultado = await resposta.json().catch(() => {
        throw new Error(`Erro do servidor: HTTP ${resposta.status}`);
      });

      if (!resposta.ok || !resultado.sucesso)
        throw new Error(resultado.mensagem || resultado.erro || 'Erro ao cadastrar.');

      setItem('');
      setQuantidade('');
      setDescricao('');
      setImagemUri(null);
      Alert.alert('Sucesso', resultado.mensagem || 'Produto cadastrado!', [
        { text: 'OK', onPress: () => router.push('/home') }
      ]);
    } catch (erro) {
      Alert.alert('Erro ao salvar',
        erro instanceof Error ? erro.message : 'Falha no cadastro.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#005CA9" />

      <View style={styles.header}>
        <Text style={styles.titulo}>Almoxarifado SENAI</Text>
        <Text style={styles.subtitulo}>Adicionar Produto</Text>
      </View>

      <View style={styles.navBar}>
        {abas.map(aba => (
          <TouchableOpacity
            key={aba.rota}
            style={[styles.navItem, aba.rota === '/adicionar' && styles.ativo]}
            onPress={() => aba.rota !== '/adicionar' && router.push(aba.rota)}
          >
            <Text style={aba.rota === '/adicionar' ? styles.textoAtivo : styles.navText}>
              {aba.nome}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.label}>Nome do Item *</Text>
          <TextInput style={styles.input} value={item} onChangeText={setItem}
            placeholder="Ex: Chave de Fenda" />

          <Text style={styles.label}>Quantidade *</Text>
          <TextInput style={styles.input} value={quantidade}
            onChangeText={setQuantidade} keyboardType="numeric" placeholder="Ex: 10" />

          <Text style={styles.label}>Descrição</Text>
          <TextInput style={[styles.input, styles.multiline]} value={descricao}
            onChangeText={setDescricao} placeholder="Descrição do item..." multiline />

          <Text style={styles.label}>Foto do Produto</Text>
          <TouchableOpacity style={styles.btnFoto} onPress={selecionarImagem}>
            <Text style={styles.btnText}>
              {imagemUri ? 'Trocar Imagem' : 'Selecionar Foto'}
            </Text>
          </TouchableOpacity>

          {imagemUri && <Image source={{ uri: imagemUri }} style={styles.preview} />}

          <TouchableOpacity style={[styles.btnSalvar, carregando && { opacity: 0.6 }]}
            onPress={salvarItem} disabled={carregando}>
            {carregando ? <ActivityIndicator color="#FFF" /> :
              <Text style={styles.btnText}>Salvar Item</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  header: { backgroundColor: '#005CA9', paddingVertical: 18, alignItems: 'center' },
  titulo: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  subtitulo: { fontSize: 12, color: '#E0E0E0', marginTop: 2 },
  navBar: { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  navItem: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  ativo: { borderBottomWidth: 3, borderBottomColor: '#005CA9' },
  navText: { fontSize: 13, fontWeight: '600', color: '#666' },
  textoAtivo: { fontSize: 13, fontWeight: 'bold', color: '#005CA9' },
  content: { padding: 16 },
  card: { backgroundColor: '#FFF', borderRadius: 10, padding: 16, elevation: 2 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 6 },
  input: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#DDD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 16 },
  multiline: { height: 80, textAlignVertical: 'top' },
  btnFoto: { backgroundColor: '#6C757D', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginBottom: 16 },
  preview: { width: '100%', height: 200, borderRadius: 8, marginBottom: 16, resizeMode: 'cover' },
  btnSalvar: { backgroundColor: '#005CA9', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' }
});
