
import React, { useState, useCallback } from 'react';
import {
  View, Text, Image, FlatList, TouchableOpacity,
  Alert, Modal, StyleSheet, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Picker from 'expo-document-picker';
import * as FS from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const API = 'http://10.154.20.107:5000';
const AZUL = '#005CA9';

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

  const carregar = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/estoque`);
      const d = await r.json();
      if (!r.ok || !d.sucesso) throw Error();
      setItens(d.estoque || []);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar o estoque.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    carregar();
  }, [carregar]));

  const exportar = async () => {
    try {
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
    } catch {
      Alert.alert('Erro', 'Falha ao exportar CSV.');
    }
  };

  const importar = async () => {
    try {
      const doc = await Picker.getDocumentAsync({
        type: '*/*', copyToCacheDirectory: true
      });
      if (doc.canceled) return;
      const arq = doc.assets[0];
      if (!arq.name.toLowerCase().endsWith('.csv'))
        return Alert.alert('Erro', 'Selecione um arquivo CSV.');

      const form = new FormData();
      form.append('arquivo', {
        uri: arq.uri, name: arq.name, type: 'text/csv'
      } as any);

      setOcupado(true);
      const r = await fetch(`${API}/api/importar-csv`, {
        method: 'POST', body: form
      });
      const d = await r.json();
      if (!r.ok || !d.sucesso) throw Error();
      Alert.alert('Sucesso', 'CSV importado!');
      carregar();
    } catch {
      Alert.alert('Erro', 'Falha ao importar CSV.');
    } finally {
      setOcupado(false);
    }
  };

  const excluir = (id?: number) => Alert.alert(
    'Confirmar exclusão',
    id !== undefined ? 'Excluir este item?' : 'Excluir TODO o estoque?',
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: async () => {
          try {
            setOcupado(true);
            const r = await fetch(
              id !== undefined
                ? `${API}/api/deletar/${id}`
                : `${API}/api/estoque`,
              { method: 'DELETE' }
            );
            const d = await r.json();
            if (!r.ok || !d.sucesso) throw Error();
            await carregar();
          } catch {
            Alert.alert('Erro', 'Não foi possível excluir.');
          } finally {
            setOcupado(false);
          }
        }
      }
    ]
  );

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
        {['Estoque', 'Adicionar', 'Retirar', 'Histórico'].map((nome, i) => (
          <TouchableOpacity
            key={nome}
            style={[s.aba, i === 0 && s.ativa]}
            onPress={() => {
              const rotas = ['/','/adicionar','/retirar','/historico'] as const;
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
        {botao('Excluir tabela', '#B91C1C', () => excluir())}
      </View>

      <Text style={s.total}>Total: {itens.length} itens</Text>

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

                {botao('Excluir', '#B91C1C', () => excluir(item.id))}
              </View>
            );
          }}
        />
      )}

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
  fotoGrande: { width: '95%', height: '75%' }
});
