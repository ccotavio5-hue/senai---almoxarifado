import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Alert,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';

// IP do seu servidor Flask
const IP_COMPUTADOR = '10.154.20.107';
const API_URL = `http://${IP_COMPUTADOR}:5000`;

interface ItemEstoque {
  id: number;
  item: string;
  descricao: string;
  quantidade: number;
  imagem: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const [estoque, setEstoque] = useState<ItemEstoque[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Função para buscar os itens do estoque
  const carregarEstoque = async () => {
    try {
      const response = await fetch(`${API_URL}/api/estoque`);

      if (!response.ok) {
        throw new Error(`Erro no servidor: ${response.status}`);
      }

      const data = await response.json();
      if (data.sucesso) {
        setEstoque(data.estoque || []);
      } else {
        Alert.alert('Erro', data.mensagem || 'Não foi possível carregar o estoque.');
      }
    } catch (error) {
      console.error('Erro ao carregar estoque:', error);
      Alert.alert('Erro de Conexão', 'Não foi possível conectar ao servidor Flask.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Recarrega o estoque automaticamente toda vez que a tela ganha foco
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      carregarEstoque();
    }, [])
  );

  // Função para puxar para atualizar (Pull-to-refresh)
  const onRefresh = () => {
    setRefreshing(true);
    carregarEstoque();
  };

  // Função para excluir um item específico
  const confirmarExclusao = (id: number, nome: string) => {
    Alert.alert(
      'Excluir Item',
      `Tem certeza que deseja excluir "${nome}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/api/deletar/${id}`, {
                method: 'DELETE',
              });
              const data = await response.json();

              if (data.sucesso) {
                Alert.alert('Sucesso', 'Item excluído com sucesso!');
                carregarEstoque();
              } else {
                Alert.alert('Erro', data.mensagem || 'Erro ao excluir item.');
              }
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível conectar ao servidor.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#005CA9" />

      {/* Cabeçalho */}
      <View style={styles.header}>
        <Text style={styles.tituloHeader}>Almoxarifado SENAI</Text>
        <Text style={styles.subtituloHeader}>Controle de Estoque</Text>
      </View>

      {/* Menu Superior */}
      <View style={styles.navBar}>
        <TouchableOpacity style={[styles.navItem, styles.navItemAtivo]}>
          <Text style={styles.navTextAtivo}>Estoque</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/adicionar')}>
          <Text style={styles.navText}>Adicionar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/retirar')}>
          <Text style={styles.navText}>Retirar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/historico')}>
          <Text style={styles.navText}>Histórico</Text>
        </TouchableOpacity>
      </View>

      {/* Conteúdo Principal */}
      <View style={styles.content}>
        <View style={styles.topActions}>
          <Text style={styles.totalItensTexto}>
            Total: {estoque.length} {estoque.length === 1 ? 'item' : 'itens'}
          </Text>
          <TouchableOpacity style={styles.btnAtualizar} onPress={carregarEstoque}>
            <Text style={styles.btnAtualizarText}>Atualizar Lista</Text>
          </TouchableOpacity>
        </View>

        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#005CA9" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={estoque}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ paddingBottom: 20 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#005CA9']}
              />
            }
            renderItem={({ item }) => (
              <View style={styles.cardItem}>
                {/* Imagem com fallback se falhar */}
                <Image
                  source={{
                    uri: item.imagem
                      ? `${API_URL}/static/uploads/${item.imagem}`
                      : `${API_URL}/static/uploads/padrao.png`,
                  }}
                  style={styles.imagemProduto}
                />

                {/* Informações do Produto */}
                <View style={styles.infoProduto}>
                  <Text style={styles.nomeItem}>{item.item}</Text>
                  <Text style={styles.descItem}>{item.descricao || 'Sem descrição'}</Text>
                  <Text style={styles.idItem}>ID: {item.id}</Text>
                </View>

                {/* Quantidade e Botão de Excluir */}
                <View style={styles.colunaDireita}>
                  <View style={styles.qtdContainer}>
                    <Text style={styles.qtdText}>{item.quantidade}</Text>
                    <Text style={styles.qtdLabel}>unid</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.btnExcluirItem}
                    onPress={() => confirmarExclusao(item.id, item.item)}
                  >
                    <Text style={styles.btnExcluirTexto}>Excluir</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Nenhum item encontrado no estoque.</Text>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  header: { backgroundColor: '#005CA9', paddingVertical: 18, alignItems: 'center' },
  tituloHeader: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  subtituloHeader: { fontSize: 12, color: '#E0E0E0', marginTop: 2 },
  navBar: { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  navItem: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  navItemAtivo: { borderBottomWidth: 3, borderBottomColor: '#005CA9' },
  navText: { fontSize: 13, fontWeight: '600', color: '#666' },
  navTextAtivo: { fontSize: 13, fontWeight: 'bold', color: '#005CA9' },
  content: { flex: 1, padding: 16 },
  topActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  totalItensTexto: { fontSize: 14, color: '#555', fontWeight: '600' },
  btnAtualizar: { backgroundColor: '#005CA9', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 6 },
  btnAtualizarText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  cardItem: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  imagemProduto: { width: 55, height: 55, borderRadius: 6, marginRight: 12, backgroundColor: '#EEE' },
  infoProduto: { flex: 1 },
  nomeItem: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  descItem: { fontSize: 12, color: '#666', marginTop: 2 },
  idItem: { fontSize: 11, color: '#999', marginTop: 4 },
  colunaDireita: { alignItems: 'flex-end', gap: 6 },
  qtdContainer: { alignItems: 'center', backgroundColor: '#EBF3FA', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  qtdText: { fontSize: 15, fontWeight: 'bold', color: '#005CA9' },
  qtdLabel: { fontSize: 9, color: '#666' },
  btnExcluirItem: { backgroundColor: '#ffebe6', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4 },
  btnExcluirTexto: { color: '#d9534f', fontSize: 10, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#888', fontSize: 14 },
});