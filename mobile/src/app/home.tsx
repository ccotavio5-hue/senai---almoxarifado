
import React, { useState, useCallback } from 'react';
import {
  View, Text, Image, FlatList, TouchableOpacity,
  Alert, Modal, StyleSheet, ActivityIndicator, Platform, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Picker from 'expo-document-picker';
import * as FS from 'expo-file-system';
import * as LegacyFS from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const API = Platform.OS === 'web'
  ? 'http://localhost:5000'
  : 'http://10.154.76.159:5000';
const AZUL = '#005CA9';

// Alert.alert nao abre mensagens no Expo Web.
const avisar = (titulo: string, mensagem: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${titulo}\n\n${mensagem}`);
  } else {
    Alert.alert(titulo, mensagem);
  }
};

type Produto = {
  id: number; item: string; descricao: string;
  quantidade: number; imagem: string;
};

export default function HomeScreen() {
  const router = useRouter();
  const [itens, setItens] = useState<Produto[]>([]);
  const [foto, setFoto] = useState('');
  const [loading, setLoading] = useState(true);
  const [ocupado, setOcupado] = useState(false);

  // Busca os produtos no Flask.
  const carregar = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/estoque`);
      const d = await r.json();
      if (!r.ok || !d.sucesso) throw Error();
      setItens(d.estoque || []);
    } catch {
      avisar('Erro', 'Não foi possível carregar o estoque.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    carregar();
  }, [carregar]));

  // Navegador: baixa o CSV gerado pelo Flask. Celular: compartilha como antes.
  const exportar = async () => {
    try {
      if (Platform.OS === 'web') {
        await Linking.openURL(`${API}/api/exportar-csv`);
        return;
      }

      const esc = (v: unknown) =>
        `"${String(v ?? '').replace(/"/g, '""')}"`;
      const linhas = itens.map(i =>
        [i.id, i.item, i.descricao, i.quantidade, i.imagem]
          .map(esc).join(';')
      );
      const csv = '\uFEFF' + [
        'ID;ITEM;DESCRIÇÃO;QUANTIDADE;FOTO', ...linhas
      ].join('\r\n');
      const arq = new FS.File(FS.Paths.cache, 'estoque.csv');
      arq.write(csv);
      await Sharing.shareAsync(arq.uri, { mimeType: 'text/csv' });
    } catch (erro) {
      avisar('Erro', erro instanceof Error ? erro.message : 'Falha ao exportar CSV.');
    }
  };

  // Envia o conteúdo do CSV em JSON: sem FormData nem uploadAsync.
  const enviarCSV = async (texto: string) => {
    if (!texto.trim()) throw new Error('O CSV está vazio.');
    const resposta = await fetch(`${API}/api/importar-csv`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv: texto }),
    });
    const dados = await resposta.json();
    if (!resposta.ok || !dados.sucesso) {
      throw new Error(dados.mensagem || dados.erro || `Erro HTTP ${resposta.status}`);
    }
    await carregar();
    return dados.mensagem || 'CSV importado com sucesso!';
  };

  const importar = async () => {
    try {
      const doc = await Picker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', '*/*'],
        copyToCacheDirectory: false,
      });
      if (doc.canceled || !doc.assets?.length) return;
      const arquivo = doc.assets[0];
      if (!arquivo.name.toLowerCase().endsWith('.csv')) {
        avisar('Arquivo inválido', 'Selecione um arquivo .csv');
        return;
      }
      setOcupado(true);
      let texto: string;

      if (Platform.OS === 'web') {
        // O seletor do navegador disponibiliza um File, nao um arquivo do Android.
        const arquivoWeb = (arquivo as typeof arquivo & {
          file?: { text: () => Promise<string> };
        }).file;
        if (arquivoWeb) {
          texto = await arquivoWeb.text();
        } else {
          const respostaArquivo = await fetch(arquivo.uri);
          if (!respostaArquivo.ok) throw new Error('Não foi possível ler o arquivo CSV.');
          texto = await respostaArquivo.text();
        }
      } else {
        // Mantem o jeito que ja funcionava no Expo Go (Android).
        try {
          texto = await LegacyFS.readAsStringAsync(arquivo.uri, {
            encoding: LegacyFS.EncodingType.UTF8,
          });
        } catch (erroLeitura) {
          try {
            const respostaArquivo = await fetch(arquivo.uri);
            if (!respostaArquivo.ok) throw new Error('Arquivo inacessível');
            texto = await respostaArquivo.text();
          } catch {
            throw new Error('O Android não permitiu ler o CSV selecionado. ' +
              'Tente escolher o arquivo pelo app Arquivos, em Downloads. ' +
              'Detalhe: ' + String(erroLeitura));
          }
        }
      }

      const mensagem = await enviarCSV(texto);
      avisar('Sucesso', mensagem);
    } catch (erro) {
      avisar('Erro ao importar', erro instanceof Error ? erro.message : 'Erro desconhecido.');
    } finally {
      setOcupado(false);
    }
  };

  // A exclusao exige login como administrador (inclusive no navegador).
  const apagarEstoque = async () => {
    setOcupado(true);
    try {
      const r = await fetch(`${API}/api/estoque`, {
        method: 'DELETE',
        // Expo Web precisa enviar o cookie da sessao de login ao Flask.
        ...(Platform.OS === 'web' ? { credentials: 'include' as const } : {}),
      });
      const d = await r.json();
      if (!r.ok || !d.sucesso) {
        throw new Error(d.mensagem || d.erro || `Erro HTTP ${r.status}`);
      }
      await carregar();
      avisar('Pronto', 'Estoque excluído com sucesso.');
    } catch (erro) {
      avisar('Erro ao excluir', erro instanceof Error ? erro.message : 'Confira a conexão com o Flask.');
    } finally {
      setOcupado(false);
    }
  };

  const excluirTabela = () => {
    const pergunta = 'Tem certeza que deseja apagar TODOS os produtos do estoque?';
    if (Platform.OS === 'web') {
      if (window.confirm(pergunta)) void apagarEstoque();
      return;
    }
    Alert.alert('Excluir tabela', pergunta, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir tudo', style: 'destructive', onPress: () => { void apagarEstoque(); } },
    ]);
  };

  const botao = (texto: string, cor: string, acao: () => void) => (
    <TouchableOpacity
      disabled={ocupado}
      onPress={acao}
      style={[s.botao, { backgroundColor: cor, opacity: ocupado ? 0.5 : 1 }]}
    >
      <Text style={s.branco}>{texto}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.tela}>
      <View style={s.header}>
        <Text style={s.titulo}>Almoxarifado SENAI</Text>
        <Text style={s.branco}>Controle de Estoque</Text>
      </View>

      <View style={s.menu}>
        {['Estoque', 'Adicionar', 'Retirar', 'Histórico', 'IA'].map((nome, i) => (
          <TouchableOpacity
            key={nome}
            style={[s.aba, i === 0 && s.ativa]}
            onPress={() => {
              const rotas = ['/','/adicionar','/retirar','/historico','/ia'] as const;
              if (i > 0) router.push(rotas[i]);
            }}
          >
            <Text style={{ color: i === 0 ? AZUL : '#666', fontWeight: 'bold', fontSize: 12 }}>
              {nome}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.acoes}>
        {botao('Exportar CSV', '#16A34A', exportar)}
        {botao('Importar CSV', '#B5AD00', importar)}
        {botao('Excluir tabela', '#B91C1C', excluirTabela)}
      </View>

      <Text style={s.total}>Total: {itens.length} itens</Text>

      <View style={{ flex: 1 }}>
        {loading ? <ActivityIndicator color={AZUL} /> : (
        <FlatList
          data={itens}
          keyExtractor={i => String(i.id)}
          onRefresh={carregar}
          refreshing={false}
          contentContainerStyle={{ padding: 12 }}
          ListEmptyComponent={<Text style={s.total}>Nenhum item encontrado.</Text>}
          renderItem={({ item }) => {
            const uri = `${API}/static/uploads/${item.imagem || 'padrao.png'}`;
            return (
              <View style={s.card}>
                <TouchableOpacity onPress={() => setFoto(uri)}>
                  <Image source={{ uri }} style={s.imagem} />
                  <Text style={s.ampliar}>Ampliar foto</Text>
                </TouchableOpacity>

                <View style={{ flex: 1 }}>
                  <Text style={s.nome}>{item.item}</Text>
                  <Text style={s.descricao}>{item.descricao || 'Sem descrição'}</Text>
                  <Text style={s.descricao}>ID: {item.id}</Text>
                  <Text style={s.quantidade}>Quantidade: {item.quantidade}</Text>
                </View>

              </View>
            );
          }}
        />
        )}
      </View>

      <View style={s.rodape}>
        <TouchableOpacity style={s.voltarLogin} onPress={() => router.replace('/')}>
          <Text style={s.voltarLoginTexto}>Voltar ao Login</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={!!foto}
        transparent
        animationType="fade"
        onRequestClose={() => setFoto('')}
      >
        <View style={s.modal}>
          <TouchableOpacity style={s.fechar} onPress={() => setFoto('')}>
            <Text style={s.branco}>✕ Fechar</Text>
          </TouchableOpacity>
          <Image source={{ uri: foto }} style={s.fotoGrande} resizeMode="contain" />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  tela: { flex: 1, backgroundColor: '#F4F6F8' },
  header: { backgroundColor: AZUL, padding: 18, alignItems: 'center' },
  titulo: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  rodape: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#F4F6F8', alignItems: 'center' },
  voltarLogin: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 6, backgroundColor: '#FFF', borderWidth: 1, borderColor: AZUL, alignItems: 'center', width: '100%', maxWidth: 320 },
  voltarLoginTexto: { color: AZUL, fontSize: 13, fontWeight: 'bold' },
  branco: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  menu: { flexDirection: 'row', backgroundColor: '#FFF' },
  aba: { flex: 1, paddingVertical: 15, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  ativa: { borderBottomColor: AZUL },
  acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, padding: 10 },
  botao: { padding: 9, borderRadius: 6 },
  total: { paddingHorizontal: 12, paddingVertical: 10, color: '#555' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 12, marginBottom: 10, borderRadius: 10, gap: 10, elevation: 2 },
  imagem: { width: 65, height: 65, borderRadius: 7, backgroundColor: '#EEE' },
  ampliar: { color: AZUL, fontSize: 9, textAlign: 'center', marginTop: 4 },
  nome: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  descricao: { fontSize: 12, color: '#666', marginTop: 3 },
  quantidade: { fontSize: 12, color: AZUL, fontWeight: 'bold', marginTop: 5 },
  modal: { flex: 1, backgroundColor: '#000E', justifyContent: 'center', alignItems: 'center' },
  fechar: { position: 'absolute', top: 55, right: 25, padding: 12, zIndex: 1 },
  fotoGrande: { width: '95%', height: '75%' },
});
