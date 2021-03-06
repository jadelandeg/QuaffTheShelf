import React, { useState, useEffect } from "react";
import { Text, View, TextInput, TouchableOpacity } from "react-native";
import { BarCodeScanner } from "expo-barcode-scanner";
import axios from "axios";
import {
  doc,
  getFirestore,
  setDoc,
  arrayUnion,
  updateDoc,
} from "firebase/firestore";
import app from "../../firebase-config";
import { getAuth } from "firebase/auth";
import styles from "../utils/styles";

const firestore = getFirestore();

const Barcode = ({ navigation }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [number, setNumber] = useState(null);
  const [isbn, setIsbn] = useState({});
  const [isError, setIsError] = useState(false);

  const auth = getAuth();
  const user = auth.currentUser;
  const email = user.email;

  useEffect(() => {
    (async () => {
      setIsError(false);
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  const handleBarCodeScanned = ({ data }) => {
    setScanned(true);

    let bookAddress = "";
    number
      ? (bookAddress = `http://openlibrary.org/api/volumes/brief/isbn/${number}.json`)
      : (bookAddress = `http://openlibrary.org/api/volumes/brief/isbn/${data}.json`);

    alert(`ISBN: ${number ? number : data} added to library`);
    axios({ method: "get", url: bookAddress })
      .then((bookDetails) => {
        const dataID =
          bookDetails.data.records[Object.keys(bookDetails.data.records)[0]];

        const bookFullISBN = dataID.details.bib_key;
        const bookISBN = bookFullISBN.slice(5);
        setIsbn({ isbn: bookISBN });

        const bookAuthor = dataID.data.authors[0].name;

        const bookTitle = dataID.data.title;

        let bookSubTitle = "";
        if (dataID.data.subtitle) {
          bookSubTitle = dataID.data.subtitle;
        } else {
          bookSubTitle = "No Subtitle found";
        }

        let bookCover = "";
        if (dataID.data.cover) {
          bookCover = dataID.data.cover.medium;
        } else {
          bookCover = "No image found";
        }

        return { bookTitle, bookSubTitle, bookAuthor, bookCover, bookISBN };
      })
      .then((scannedBook) => {
        const { bookTitle, bookSubTitle, bookAuthor, bookCover, bookISBN } =
          scannedBook;
        const docRef = doc(firestore, `books/${bookISBN}`);
        setDoc(
          docRef,
          {
            bookTitle,
            bookSubTitle,
            bookAuthor,
            bookCover,
          },
          { merge: true }
        );
        return bookISBN;
      })
      .then((bookISBN) => {
        const docRef = doc(firestore, `users/${email}`);
        updateDoc(docRef, { bookLibrary: arrayUnion(bookISBN) });
      })
      .catch(() => {
        setIsError(true);
      });
  };

  if (isError) {
    return <Text>Sorry, something went wrong...</Text>;
  }

  if (hasPermission === null) {
    return <Text>Requesting for camera permission</Text>;
  }

  if (hasPermission === false) {
    return (
      <View>
        <TextInput
          onChangeText={setNumber}
          value={number}
          placeholder="enter ISBN"
          keyboardType="numeric"
          onSubmitEditing={handleBarCodeScanned}
        />
        <TouchableOpacity style={styles.button} onPress={handleBarCodeScanned}>
          <Text style={styles.buttonText}>Submit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            navigation.navigate("Home");
          }}
        >
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <View style={styles.addBookScannerContainer}>
        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
          style={styles.addBookScanner}
        />
      </View>
      <View style={styles.addBookButtonContainer}>
        {scanned && (
          <View>
            <TouchableOpacity
              style={styles.button}
              onPress={() => setScanned(false)}
            >
              <Text style={styles.buttonText}> Scan Again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate("BookDetails", isbn)}
            >
              <Text style={styles.buttonText}> Book Details</Text>
            </TouchableOpacity>
          </View>
        )}
        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            navigation.navigate("Home");
          }}
        >
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
      </View>
    </>
  );
};

export default Barcode;
