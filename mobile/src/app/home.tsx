import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const IP_COMPUTADOR = '10.154.20.107';
const API_PRODUTOS = `http://${IP_COMPUTADOR}:5000/api/produtos`;

interface Produto {
  id_item: number;
  nome_item: string;
  quantidade: number;
  min_item: number;
}

export default function HomeScreen() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const carregarProdutos = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_PRODUTOS);
      const data = await response.json();

      if (response.ok && data.sucesso) {
        setProdutos(data.produtos);
      } else {
        Alert.alert('Erro', data.mensagem || 'Não foi possível carregar os produtos.');
      }
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      Alert.alert('Erro de Conexão', 'Não foi possível conectar ao servidor Flask.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarProdutos();
  }, []);

  const handleSair = () => {
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#005CA9" />

      <View style={styles.header}>
        <View>
          <Text style={styles.tituloHeader}>Estoque do Almoxarifado</Text>
          <Text style={styles.subtituloHeader}>Itens cadastrados</Text>
        </View>
        <TouchableOpacity style={styles.botaoSair} onPress={handleSair}>
          <Text style={styles.textoBotaoSair}>Sair</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#005CA9" />
          <Text style={styles.textoLoading}>Buscando produtos do banco...</Text>
        </View>
      ) : (
        <FlatList
          data={produtos}
          keyExtractor={(item) => item.id_item.toString()}
          contentContainerStyle={styles.lista}
          onRefresh={carregarProdutos}
          refreshing={loading}
          renderItem={({ item }) => (
            <View style={styles.cardItem}>
              <View style={styles.infoContainer}>
                <Text style={styles.nomeItem}>{item.nome_item}</Text>
                <Text style={styles.detalheItem}>Cód. Item: #{item.id_item}</Text>
              </View>

              <View style={styles.qtdContainer}>
                <Text style={styles.labelQtd}>Quantidade</Text>
                <Text
                  style={[
                    styles.valorQtd,
                    item.quantidade <= item.min_item && styles.alertaQtd
                  ]}
                >
                  {item.quantidade}
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.textoVazio}>Nenhum produto cadastrado no momento.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F8',
  },
  header: {
    backgroundColor: '#005CA9',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  tituloHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  subtituloHeader: {
    fontSize: 12,
    color: '#E0E0E0',
  },
  botaoSair: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  textoBotaoSair: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoLoading: {
    marginTop: 10,
    color: '#666',
  },
  lista: {
    padding: 16,
  },
  cardItem: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 2,
  },
  infoContainer: {
    flex: 1,
  },
  nomeItem: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  detalheItem: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  qtdContainer: {
    alignItems: 'flex-end',
  },
  labelQtd: {
    fontSize: 11,
    color: '#888',
  },
  valorQtd: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#005CA9',
  },
  alertaQtd: {
    color: '#D9534F',
  },
  textoVazio: {
    textAlign: 'center',
    color: '#888',
    marginTop: 40,
    fontSize: 14,
  },
});