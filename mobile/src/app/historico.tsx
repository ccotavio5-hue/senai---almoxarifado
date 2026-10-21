import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const IP_COMPUTADOR = '10.154.20.107';
const API_URL = `http://${IP_COMPUTADOR}:5000`;

interface HistoricoItem {
  id: number;
  item: string;
  quantidade: number;
  pessoa: string;
  data_hora: string;
}

export default function HistoricoScreen() {
  const router = useRouter();
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [loading, setLoading] = useState(false);

  const carregarHistorico = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/historico`);
      const data = await response.json();
      if (response.ok && data.sucesso) {
        setHistorico(data.historico || []);
      } else {
        Alert.alert('Erro', 'Não foi possível buscar o histórico.');
      }
    } catch (error) {
      Alert.alert('Erro de Conexão', 'Falha ao conectar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarHistorico();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#005CA9" />

      {/* Cabeçalho */}
      <View style={styles.header}>
        <Text style={styles.tituloHeader}>Almoxarifado SENAI</Text>
        <Text style={styles.subtituloHeader}>Histórico de Retiradas</Text>
      </View>

      {/* Navegação */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/home')}>
          <Text style={styles.navText}>Estoque</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/adicionar')}>
          <Text style={styles.navText}>Adicionar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/retirar')}>
          <Text style={styles.navText}>Retirar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navItem, styles.navItemAtivo]}>
          <Text style={styles.navTextAtivo}>Histórico</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de Registros */}
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#005CA9" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={historico}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item }) => (
              <View style={styles.cardHistorico}>
                <View style={styles.leftCol}>
                  <Text style={styles.itemNome}>{item.item}</Text>
                  <Text style={styles.pessoaNome}>Retirado por: {item.pessoa}</Text>
                  <Text style={styles.dataHora}>
                    {item.data_hora ? new Date(item.data_hora).toLocaleString('pt-BR') : '-'}
                  </Text>
                </View>

                <View style={styles.qtdBadge}>
                  <Text style={styles.qtdText}>-{item.quantidade}</Text>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Nenhuma retirada registrada.</Text>
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
  cardHistorico: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
  },
  leftCol: { flex: 1 },
  itemNome: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  pessoaNome: { fontSize: 13, color: '#555', marginTop: 2 },
  dataHora: { fontSize: 11, color: '#888', marginTop: 4 },
  qtdBadge: { backgroundColor: '#FFEBEE', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  qtdText: { fontSize: 14, fontWeight: 'bold', color: '#DC3545' },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#888', fontSize: 14 },
});