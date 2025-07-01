import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import mtnLogo from './assets/mtn.png';       // path to MTN logo
import orangeLogo from './assets/orange.png'; // path to Orange logo
import { Linking } from 'react-native';


export default function Transfer({ route }) {
    const { employee } = route.params || {};

    const [selectedNumber, setSelectedNumber] = useState('');
    const [senderNumber, setSenderNumber] = useState('');
    const [fees, setFees] = useState('');
    const [loading, setLoading] = useState(false);


    function getOperatorLogo(number) {
        if (!number) return null;

        // Clean number from spaces or + if needed
        const cleanNumber = number.replace(/\D/g, ''); // keep digits only

        // Check MTN prefixes
        const mtnPrefixes = ['67', '650', '651', '652', '653', '654', '680'];
        for (const prefix of mtnPrefixes) {
            if (cleanNumber.startsWith(prefix)) return mtnLogo;
        }

        // Check Orange prefixes
        const orangePrefixes = ['69', '655', '656', '657', '658', '659', '640', '686', '687', '688', '689'];
        for (const prefix of orangePrefixes) {
            if (cleanNumber.startsWith(prefix)) return orangeLogo;
        }

        return null;
    }
    function getOperator(number) {
        if (!number) return "";
        const cleanNumber = number.replace(/\D/g, '');
        const mtnPrefixes = ['67', '650', '651', '652', '653', '654', '680'];
        const orangePrefixes = ['69', '655', '656', '657', '658', '659', '640', '686', '687', '688', '689'];

        for (const prefix of mtnPrefixes) {
            if (cleanNumber.startsWith(prefix)) return "MTN";
        }
        for (const prefix of orangePrefixes) {
            if (cleanNumber.startsWith(prefix)) return "ORANGE";
        }
        return "";
    }




    useEffect(() => {
        if (employee.mobile_phone && !employee.work_phone) {
            setSelectedNumber(employee.mobile_phone);
        } else if (!employee.mobile_phone && employee.work_phone) {
            setSelectedNumber(employee.work_phone);
        }
    }, [employee]);

    function getImageSize(base64String) {
        return (base64String.length * (3 / 4)) -
            (base64String.endsWith("=") ? 1 : 0) -
            (base64String.endsWith("==") ? 1 : 0);
    }

    function parseNumber(value) {
        return parseFloat(value) || 0;
    }

    const wageAmount = employee.wage !== 'N/A' ? parseNumber(employee.wage) : 0;
    const feeAmount = parseNumber(fees);
    const totalAmount = wageAmount + feeAmount;

    async function handleTransfer() {
        if (!senderNumber) {
            Alert.alert('Error', 'Please enter the sender\'s number.');
            return;
        }
        if (!selectedNumber) {
            Alert.alert('Error', 'Please select a receiver\'s number.');
            return;
        }

        setLoading(true); // Show spinner

        try {
            const response = await fetch('https://payment-api-0dyt.onrender.com/api/payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    senderNumber,
                    amount: totalAmount,
                    receiverName: employee.name || "Receiver",
                    receiverEmail: employee.work_email || "example@gmail.com",
                    network: getOperator(selectedNumber)
                })
            });

            const result = await response.json();
            setLoading(false); // Hide spinner

            if (result.success) {
                const paymentLink = result.data?.data?.link;

                if (paymentLink) {
                    Alert.alert(
                        'Payment Initiated',
                        'You’ll be redirected to confirm the payment.',
                        [
                            {
                                text: 'Proceed',
                                onPress: () => Linking.openURL(paymentLink)
                            }
                        ]
                    );
                } else {
                    Alert.alert('Payment Initiated', 'Payment was created, but no link was returned.');
                }
            } else {
                Alert.alert('Error', result.message || 'Failed to initiate payment.');
            }

        } catch (error) {
            setLoading(false); // Hide spinner
            console.error('Payment error:', error);
            Alert.alert('Error', 'Check your Internet Access.');
        }
    }



    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={{ width: '100%' }}>
                <View style={styles.topSection}>
                    <View style={styles.imageContainer}>
                        {employee.image_1920 && getImageSize(employee.image_1920) >= 5 * 1024 ? (
                            <Image
                                source={{ uri: `data:image/png;base64,${employee.image_1920}` }}
                                style={styles.image}
                            />
                        ) : (
                            <Text style={styles.initial}>
                                {employee.name ? employee.name.charAt(0).toUpperCase() : '?'}
                            </Text>
                        )}
                    </View>
                    <Text style={styles.name}>{employee.name}</Text>
                </View>

                <Text style={styles.selectLabel}>Select Receiver's Number</Text>

                <View style={styles.radioGroup}>
                    {employee.mobile_phone && (
                        <TouchableOpacity
                            style={styles.radioOption}
                            onPress={() => setSelectedNumber(employee.mobile_phone)}
                        >
                            <View style={[styles.radioCircle, selectedNumber === employee.mobile_phone && styles.selected]} />
                            <Text style={styles.radioText}>{employee.mobile_phone}</Text>
                            {getOperatorLogo(employee.mobile_phone) && (
                                <Image
                                    source={getOperatorLogo(employee.mobile_phone)}
                                    style={styles.operatorLogo}
                                />
                            )}
                        </TouchableOpacity>
                    )}

                    {employee.work_phone && (
                        <TouchableOpacity
                            style={styles.radioOption}
                            onPress={() => setSelectedNumber(employee.work_phone)}
                        >
                            <View style={[styles.radioCircle, selectedNumber === employee.work_phone && styles.selected]} />
                            <Text style={styles.radioText}>{employee.work_phone}</Text>
                            {getOperatorLogo(employee.work_phone) && (
                                <Image
                                    source={getOperatorLogo(employee.work_phone)}
                                    style={styles.operatorLogo}
                                />
                            )}
                        </TouchableOpacity>
                    )}

                </View>

                <Text style={styles.senderLabel}>Sender's Number</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Sender's Number"
                    value={senderNumber}
                    onChangeText={setSenderNumber}
                    keyboardType="phone-pad"
                />

                <Text style={styles.senderLabel}>Add fees/Extra(optional)</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Add fees/Extra (optional)"
                    value={fees}
                    onChangeText={setFees}
                    keyboardType="numeric"
                />

                <Text style={styles.wage}>Salary: {employee.wage !== 'N/A' ? `${employee.wage} FCFA` : 'N/A'}</Text>
                <Text style={styles.total}>Total: {totalAmount} FCFA</Text>

                {loading ? (
                    <ActivityIndicator size="large" color="#007bff" />
                ) : (
                    <TouchableOpacity style={styles.transferButton} onPress={handleTransfer}>
                        <Text style={styles.transferButtonText}>Transfer Money</Text>
                    </TouchableOpacity>
                )}
            </View>
        </KeyboardAvoidingView>

    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f8f9fa',
    },
    topSection: { alignItems: 'center', marginBottom: 20 },
    imageContainer: {
        width: 100, height: 100, borderRadius: 50, backgroundColor: '#007bff',
        justifyContent: 'center', alignItems: 'center', overflow: 'hidden'
    },
    image: { width: '100%', height: '100%', borderRadius: 50 },
    initial: { fontSize: 40, fontWeight: 'bold', color: '#fff' },
    name: { fontSize: 24, fontWeight: 'bold', color: '#333', marginTop: 10 },
    selectLabel: { fontSize: 18, fontWeight: 'bold', marginVertical: 15, color: '#555' },
    radioGroup: { marginBottom: 20 },
    radioOption: {
        flexDirection: 'row', alignItems: 'center',
        marginBottom: 12, backgroundColor: '#fff', padding: 10,
        borderRadius: 8, elevation: 2
    },
    radioCircle: {
        height: 20, width: 20, borderRadius: 10,
        borderWidth: 2, borderColor: '#007bff',
        alignItems: 'center', justifyContent: 'center', marginRight: 10
    },
    selected: { backgroundColor: '#007bff' },
    radioText: { fontSize: 16, color: '#333' },
    senderLabel: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#555' },
    input: {
        backgroundColor: '#fff', borderRadius: 8, elevation: 2,
        padding: 10, fontSize: 16, marginBottom: 20
    },
    wage: { fontSize: 18, color: '#00008B', fontWeight: 'bold', marginBottom: 5 },
    total: { fontSize: 18, color: '#28a745', fontWeight: 'bold', marginBottom: 20 },
    transferButton: {
        backgroundColor: '#007bff', padding: 15, borderRadius: 8,
        alignItems: 'center', marginTop: 'auto'
    },
    transferButtonText: {
        color: '#fff', fontSize: 18, fontWeight: 'bold'
    },
    operatorLogo: {
        width: 50,
        height: 30,
        marginLeft: 'auto', // push to the right
        resizeMode: 'contain',
    },

});
