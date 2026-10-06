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

// IP da sua máquina
const IP_COMPUTADOR = '10.154.20.107'; 
const API_URL = `http://${IP_COMPUTADOR}:5000/api/login`;

export default function LoginScreen() {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // 1. Botão ENTRAR (Acessa o sistema / estoque)
  const handleLogin = async () => {
    if (!usuario.trim() || !senha.trim()) {
      Alert.alert('Atenção', 'Por favor, preencha o usuário e a senha.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, senha }),
      });

      const data = await response.json();

      if (response.ok && data.sucesso) {
        Alert.alert(
          'Sucesso!', 
          `Bem-vindo, ${usuario}! (${data.tipo === 'adm' ? 'Administrador' : 'Usuário'})`,
          [{ text: 'Continuar', onPress: () => router.replace('/home') }]
        );
      } else {
        Alert.alert('Erro no Login', data.mensagem || 'Usuário ou senha incorretos.');
      }
    } catch (error) {
      console.error('Erro ao conectar na API:', error);
      Alert.alert(
        'Erro de Conexão', 
        'Não foi possível conectar ao servidor Flask. Verifique o Firewall.'
      );
    } finally {
      setLoading(false);
    }
  };

  // 2. Botão CADASTRE-SE ADM (Valida se o usuário digitado é ADM e vai para a tela de cadastro)
  const handleIrParaCadastro = async () => {
    if (!usuario.trim() || !senha.trim()) {
      Alert.alert('Atenção', 'Preencha o Usuário e a Senha de Administrador nos campos acima para prosseguir.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, senha }),
      });

      const data = await response.json();

      if (response.ok && data.sucesso) {
        // Verifica se o usuário autenticado tem perfil de Administrador
        if (data.tipo === 'adm' || data.e_adm === true) {
          router.push('/cadastro'); // Redireciona para o cadastro
        } else {
          Alert.alert('Acesso Negado', 'Apenas usuários Administradores podem acessar a página de cadastro.');
        }
      } else {
        Alert.alert('Erro de Autenticação', data.mensagem || 'Usuário ou senha incorretos.');
      }
    } catch (error) {
      console.error('Erro ao conectar na API:', error);
      Alert.alert('Erro de Conexão', 'Não foi possível conectar ao servidor Flask.');
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

        {/* Botão de ENTRAR (Acessa o sistema) */}
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

        {/* Botão Cadastre-se ADM (Usa as mesmas caixas de texto) */}
        <TouchableOpacity 
          style={styles.btnCadastro} 
          onPress={handleIrParaCadastro}
          disabled={loading}
        >
          <Text style={styles.btnCadastroText}>Cadastre-se (ADM)</Text>
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
  btnCadastro: {
    marginTop: 15,
    alignItems: 'center',
    paddingVertical: 10,
  },
  btnCadastroText: {
    color: '#005CA9',
    fontSize: 16,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});