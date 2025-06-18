import React, { useState } from "react";
import {
  View,
  Button,
  Text,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import axios from "axios";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";

const UploadPDFScreen = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState([]);

  const pickPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
      });

      console.log("Résultat selection:", result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedFile(result.assets[0]);
      } else {
        Alert.alert("Erreur", "Aucun fichier sélectionné");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Erreur", "Impossible de récupérer le fichier");
    }
  };

  const uploadPDF = async () => {
    if (!selectedFile) {
      Alert.alert("Erreur", "Aucun fichier sélectionné");
      return;
    }

    try {
      setLoading(true);

      const base64Data = await FileSystem.readAsStringAsync(selectedFile.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const payload = {
        file: base64Data,
        name: selectedFile.name,
      };

      const response = await axios.post(
        "https://memorycardapp.onrender.com/upload",
        payload,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // console.log("Réponse du backend :", response.data);
      setCards(response.data.cards);
    } catch (err) {
      console.error(err);
      Alert.alert("Erreur", "Impossible d’envoyer le PDF");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Button title="Sélectionner un PDF" onPress={pickPDF} />
      {selectedFile && (
        <Text style={{ marginTop: 10 }}>Fichier : {selectedFile.name}</Text>
      )}
      <Button
        title="Envoyer le PDF"
        onPress={uploadPDF}
        disabled={!selectedFile || loading}
      />
      {loading && <ActivityIndicator size="large" color="#0000ff" />}

      {cards.length > 0 && (
        <ScrollView style={{ marginTop: 20 }}>
          <Text>Cartes générées :</Text>
          {cards.map((card, index) => (
            <View
              key={index}
              style={{
                backgroundColor: "#f0f0f0",
                marginVertical: 5,
                padding: 10,
                borderRadius: 5,
              }}
            >
              <Text style={{ fontWeight: "bold" }}>{card.title}</Text>
              <Text>{card.content}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

export default UploadPDFScreen;
