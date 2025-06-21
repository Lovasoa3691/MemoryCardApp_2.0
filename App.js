import React, { useEffect, useState } from "react";
import {
  View,
  Button,
  Text,
  ActivityIndicator,
  Alert,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import axios from "axios";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";

const UploadPDFScreen = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState({
    carte: "",
  });

  const [carteData, setCarteData] = useState([]);

  const chargerCartes = async () => {
    try {
      await axios
        // .get("http://192.168.137.66:5000/cartes")
        .get("https://memorycardapp-2-0.onrender.com/cartes")
        .then((response) => {
          // console.log("Cartes chargées:", response.data);
          setCarteData(response.data);
        })
        .catch((error) => {
          console.error("Erreur lors du chargement des cartes:", error);
          Alert.alert("Erreur", "Impossible de charger les cartes");
        });
    } catch (error) {
      console.error("Erreur de chargement:", error);
      Alert.alert(
        "Erreur",
        "Une erreur s'est produite lors du chargement des cartes"
      );
    }
  };

  useEffect(() => {
    chargerCartes();
  }, []);

  const pickPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
      });

      console.log("Résultat sélection:", result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selected = result.assets[0];

        const fichierExiste = carteData.some(
          (carte) => carte.titre === selected.name
        );

        if (fichierExiste) {
          Alert.alert("Erreur", "Ce fichier a déjà été sélectionné ou envoyé.");
        } else {
          setSelectedFile(selected);
        }
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
        // "http://192.168.137.66:5000/upload",
        "https://memorycardapp-2-0.onrender.com/upload",
        payload,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // console.log(response.data.resultat);
      setCards({
        carte: response.data.resultat,
        fichier: response.data.fichier,
      });

      chargerCartes();
    } catch (err) {
      console.error(err);
      Alert.alert("Erreur", "Impossible d’envoyer le PDF");
    } finally {
      setLoading(false);
    }
  };

  const supprimerCarte = async (id) => {
    try {
      // await axios.delete(`http://192.168.137.66:5000/cartes/${id}`);
      await axios.delete(`https://memorycardapp-2-0.onrender.com/cartes/${id}`);
      Alert.alert("Succès", "Carte supprimée avec succès");
      chargerCartes();
    } catch (error) {
      console.error("Erreur lors de la suppression de la carte:", error);
      Alert.alert("Erreur", "Impossible de supprimer la carte");
    }
  };

  const formatDate = (date) => {
    const current = new Date(date);
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, "0");
    const day = String(current.getDate()).padStart(2, "0");
    const hours = String(current.getHours()).padStart(2, "0");
    const minutes = String(current.getMinutes()).padStart(2, "0");

    return `${year}/${month}/${day} ${hours}:${minutes}`;
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
      {carteData.length > 0 && (
        <ScrollView style={{ marginTop: 20 }}>
          <Text style={{ fontWeight: "bold" }}>Cartes générées :</Text>
          {carteData.map((carte, index) => (
            <View
              key={carte.idCarte}
              style={{
                backgroundColor: "#e0ffe0",
                marginVertical: 5,
                padding: 10,
                borderRadius: 5,
              }}
            >
              <Text style={{ fontWeight: "bold" }}>
                {carte.titre + " || crée le " + formatDate(carte.created_at)}
              </Text>
              <Text>{carte.contenu}</Text>
              <TouchableOpacity
                onPress={() => supprimerCarte(carte.idCarte)}
                style={{
                  marginTop: 5,
                  backgroundColor: "#ffcccc",
                  padding: 5,
                  borderRadius: 5,
                  alignSelf: "flex-end",
                }}
              >
                <Text style={{ color: "red" }}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

export default UploadPDFScreen;
