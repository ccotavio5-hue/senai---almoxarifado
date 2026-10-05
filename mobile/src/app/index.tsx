import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

// IP da sua máquina confirmado no Postman
const IP_COMPUTADOR = '10.154.20.107'; 
const API_URL = `http://${IP_COMPUTADOR}:5000/api/login`;

export default function LoginScreen() {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!usuario.trim() || !senha.trim()) {
      Alert.alert('Atenção', 'Por favor, preencha o usuário e a senha.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usuario: usuario,
          senha: senha,
        }),
      });

      const data = await response.json();

      if (response.ok && data.sucesso) {
        Alert.alert(
          'Sucesso!', 
          `Bem-vindo, ${usuario}! (${data.tipo === 'adm' ? 'Administrador' : 'Usuário'})`,
          [
            {
              text: 'Continuar',
              onPress: () => router.replace('/home')
            }
          ]
        );
      } else {
        Alert.alert('Erro no Login', data.mensagem || 'Usuário ou senha incorretos.');
      }
    } catch (error) {
      console.error('Erro ao conectar na API:', error);
      Alert.alert(
        'Erro de Conexão', 
        'Não foi possível conectar ao servidor Flask. Verifique se o Firewall liberou a porta 5000.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#005CA9" />

      <View style={styles.header}>
        <Text style={styles.tituloHeader}>Almoxarifado SENAI</Text>
        <Text style={styles.subtituloHeader}>Acesse sua conta</Text>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.label}>Usuário</Text>
        <TextInput
          style={styles.input}
          placeholder="Digite seu usuário"
          placeholderTextColor="#999"
          value={usuario}
          onChangeText={setUsuario}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Senha</Text>
        <TextInput
          style={styles.input}
          placeholder="Digite sua senha"
          placeholderTextColor="#999"
          value={senha}
          onChangeText={setSenha}
          secureTextEntry
        />

        <TouchableOpacity 
          style={styles.botao} 
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.textoBotao}>ENTRAR</Text>
          )}
        </TouchableOpacity>
      </View>
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
    paddingVertical: 40,
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  tituloHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  subtituloHeader: {
    fontSize: 14,
    color: '#E0E0E0',
    marginTop: 4,
  },
  formContainer: {
    padding: 24,
    marginTop: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    marginBottom: 18,
  },
  botao: {
    backgroundColor: '#005CA9',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    elevation: 2,
  },
  textoBotao: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});