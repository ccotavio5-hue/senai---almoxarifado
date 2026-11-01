
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

// Chave da Groq
const GROQ_API_KEY = "";

export default function IA() {
  const router = useRouter();

  const [pergunta, setPergunta] = useState("");
  const [resposta, setResposta] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function perguntar() {
    if (!pergunta.trim()) {
      Alert.alert("Atenção", "Digite uma pergunta!");
      return;
    }

    setCarregando(true);
    setResposta("");

    try {
      const resultado = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: "openai/gpt-oss-20b",
            temperature: 0.7,
            max_tokens: 1024,
            messages: [
              {
                role: "system",
                content:
                  "Você é um assistente especialista em almoxarifado, ferramentas e materiais de construção/manutenção. Responda de forma clara e objetiva para que serve a ferramenta, quais os cuidados de segurança ao utilizá-la e como deve ser armazenada.",
              },
              {
                role: "user",
                content: pergunta.trim(),
              },
            ],
          }),
        }
      );

      const dados = await resultado.json();

      if (!resultado.ok) {
        throw new Error(
          dados.error?.message || `Erro da Groq: ${resultado.status}`
        );
      }

      setResposta(
        dados.choices?.[0]?.message?.content ||
          "Não foi possível obter uma resposta."
      );
    } catch (erro: any) {
      Alert.alert(
        "Erro",
        erro.message || "Não foi possível consultar a IA."
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content"/>

      <View style={styles.header}>
        <Text style={styles.tituloHeader}>Almoxarifado SENAI</Text>
        <Text style={styles.subtituloHeader}>Assistente IA</Text>
      </View>

      <View style={styles.navBar}>
        {([
          ['Estoque', '/home'],
          ['Adicionar', '/adicionar'],
          ['Retirar', '/retirar'],
          ['Histórico', '/historico'],
          ['IA', '/ia'],
        ] as const).map(([nome, rota]) => (
          <TouchableOpacity
            key={rota}
            style={[styles.navItem, rota === '/ia' && styles.navItemAtivo]}
            onPress={() => rota !== '/ia' && router.push(rota)}
          >
            <Text style={rota === '/ia' ? styles.navTextAtivo : styles.navText}>
              {nome}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.conteudo}>
        <Text style={styles.label}>
          Pergunte sobre ferramentas, materiais e segurança:
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Ex.: Para que serve uma furadeira?"
          placeholderTextColor="#888"
          multiline
          value={pergunta}
          onChangeText={setPergunta}
        />

        <TouchableOpacity
          style={styles.botao}
          onPress={perguntar}
          disabled={carregando}
        >
          <Text style={styles.botaoTexto}>
            {carregando ? "Consultando..." : "Perguntar à IA"}
          </Text>
        </TouchableOpacity>

        {carregando && (
          <ActivityIndicator
            size="large"
            color="#005CA9"
            style={{ marginTop: 20 }}
          />
        )}

        {!!resposta && (
          <View style={styles.caixaResposta}>
            <Text style={styles.respostaTitulo}>Resposta da IA</Text>
            <Text style={styles.resposta}>{resposta}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: { backgroundColor: '#005CA9', paddingVertical: 18, alignItems: 'center' },
  tituloHeader: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  subtituloHeader: { fontSize: 12, color: '#E0E0E0', marginTop: 2 },
  navBar: { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  navItem: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  navItemAtivo: { borderBottomWidth: 3, borderBottomColor: '#005CA9' },
  navText: { fontSize: 12, fontWeight: '600', color: '#666' },
  navTextAtivo: { fontSize: 12, fontWeight: 'bold', color: '#005CA9' },
  conteudo: {
    padding: 20,
  },
  label: {
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 10,
    padding: 15,
    minHeight: 110,
    textAlignVertical: "top",
    fontSize: 16,
  },
  botao: {
    backgroundColor: "#005CA9",
    padding: 15,
    borderRadius: 10,
    marginTop: 15,
    alignItems: "center",
  },
  botaoTexto: {
    color: "white",
    fontSize: 17,
    fontWeight: "bold",
  },
  caixaResposta: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    marginTop: 25,
    marginBottom: 40,
  },
  respostaTitulo: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#005CA9",
    marginBottom: 12,
  },
  resposta: {
    fontSize: 16,
    lineHeight: 24,
    color: "#333",
  },
});
