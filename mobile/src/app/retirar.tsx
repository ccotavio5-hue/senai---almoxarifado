import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const IP_COMPUTADOR = '10.154.20.107';
const API_URL = `http://${IP_COMPUTADOR}:5000`;

export default function RetirarScreen() {
  const router = useRouter();
  const [itemId, setItemId] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [pessoa, setPessoa] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRetirar = async () => {
    if (!itemId.trim() || !quantidade.trim() || !pessoa.trim()) {
      Alert.alert('Atenção', 'Preencha todos os campos obrigatórios.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/retirar`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: parseInt(itemId, 10),
          quantidade: parseInt(quantidade, 10),
          pessoa: pessoa.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.sucesso) {
        Alert.alert('Sucesso', data.mensagem || 'Retirada realizada!', [
          { text: 'OK', onPress: () => router.push('/home') },
        ]);
      } else {
        Alert.alert('Erro', data.mensagem || 'Não foi possível realizar a retirada.');
      }
    } catch (error) {
      Alert.alert('Erro de Conexão', 'Não foi possível conectar ao servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#005CA9" />

      {/* Cabeçalho */}
      <View style={styles.header}>
        <Text style={styles.tituloHeader}>Almoxarifado SENAI</Text>
        <Text style={styles.subtituloHeader}>Retirar Produto</Text>
      </View>

      {/* Navegação */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/home')}>
          <Text style={styles.navText}>Estoque</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/adicionar')}>
          <Text style={styles.navText}>Adicionar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navItem, styles.navItemAtivo]}>
          <Text style={styles.navTextAtivo}>Retirar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/historico')}>
          <Text style={styles.navText}>Histórico</Text>
        </TouchableOpacity>
      </View>

      {/* Formulário */}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>ID do Produto *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 1"
            keyboardType="numeric"
            value={itemId}
            onChangeText={setItemId}
          />

          <Text style={styles.label}>Quantidade a Retirar *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 2"
            keyboardType="numeric"
            value={quantidade}
            onChangeText={setQuantidade}
          />

          <Text style={styles.label}>Nome do Responsável/Pessoa *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Carlos Silva"
            value={pessoa}
            onChangeText={setPessoa}
          />

          <TouchableOpacity
            style={styles.btnRetirar}
            onPress={handleRetirar}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.btnText}>Confirmar Retirada</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  content: { padding: 16 },
  card: { backgroundColor: '#FFF', borderRadius: 10, padding: 16, elevation: 2 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 6 },
  input: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#DDD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 16 },
  btnRetirar: { backgroundColor: '#DC3545', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
});