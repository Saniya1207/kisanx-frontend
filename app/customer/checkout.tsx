import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet, Text,
  TouchableOpacity, View, StatusBar, Modal, FlatList,
  KeyboardAvoidingView, Platform, BackHandler, TextInput,
  Animated, Easing, Linking
} from "react-native";
import Svg, { Path, Circle, Rect, Polygon, Text as SvgText } from "react-native-svg";
import * as Location from "expo-location";
import { WebView } from "react-native-webview";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCart, CartItem } from "../../context/CartContext";

// ============================================================
// 🎨 PAYMENT SVG ICONS
// ============================================================

const GooglePayIcon = ({ size = 44 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Rect width="48" height="48" rx="10" fill="#FFFFFF" />
    <Rect width="48" height="48" rx="10" fill="none" stroke="#E8E8E8" strokeWidth="1" />
    <Path
      d="M24.5 22.2h8.8c.1.5.2 1 .2 1.8 0 5.2-3.5 8.9-8.9 8.9-5.1 0-9.3-4.2-9.3-9.3s4.2-9.3 9.3-9.3c2.5 0 4.6.9 6.2 2.4l-2.5 2.5c-.7-.6-1.9-1.4-3.7-1.4-3.2 0-5.8 2.7-5.8 5.9s2.6 5.9 5.8 5.9c3.7 0 5.1-2.6 5.3-4h-5.4v-3.4z"
      fill="#4285F4"
    />
  </Svg>
);

const UPIIcon = ({ size = 44 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Rect width="48" height="48" rx="10" fill="#FFFFFF" />
    <Rect width="48" height="48" rx="10" fill="none" stroke="#E8E8E8" strokeWidth="1" />
    <Path d="M24 8 L32 20 H27 V30 H21 V20 H16 Z" fill="#097939" />
    <Path d="M14 34 H34" stroke="#097939" strokeWidth="1.5" />
    <SvgText x="24" y="43" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#097939">UPI</SvgText>
  </Svg>
);

const PayPalIcon = ({ size = 44 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Rect width="48" height="48" rx="10" fill="#FFFFFF" />
    <Rect width="48" height="48" rx="10" fill="none" stroke="#E8E8E8" strokeWidth="1" />
    <Path d="M20 10h9c4.5 0 7.5 2.5 7.5 6.5 0 5-3.5 8-8.5 8H25l-1.5 8H18L20 10z" fill="#009CDE" />
    <Path d="M14 14h9c4.5 0 7.5 2.5 7.5 6.5 0 5-3.5 8-8.5 8H19l-1.5 8H12L14 14z" fill="#003087" />
  </Svg>
);

const CreditCardIcon = ({ size = 44 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Rect width="48" height="48" rx="10" fill="#059669" />
    <Rect x="8" y="14" width="32" height="20" rx="3" fill="none" stroke="white" strokeWidth="1.5" />
    <Rect x="8" y="20" width="32" height="5" fill="white" fillOpacity="0.3" />
    <Rect x="12" y="27" width="8" height="3" rx="1" fill="white" fillOpacity="0.7" />
    <Rect x="24" y="27" width="5" height="3" rx="1" fill="white" fillOpacity="0.5" />
    <Rect x="31" y="27" width="5" height="3" rx="1" fill="white" fillOpacity="0.5" />
    <Rect x="12" y="15" width="8" height="6" rx="1" fill="white" fillOpacity="0.4" />
  </Svg>
);

const CODIcon = ({ size = 36 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 36 36">
    <Circle cx="18" cy="18" r="18" fill="#F59E0B" />
    <Circle cx="18" cy="18" r="12" fill="none" stroke="white" strokeWidth="1.5" />
    <SvgText x="18" y="22" textAnchor="middle" fontSize="11" fontWeight="bold" fill="white">₹</SvgText>
  </Svg>
);

// ============================================================
// 🗺️ MAP PICKER — OpenStreetMap (FREE, no API key needed!)
// ============================================================

interface LocationPickerProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (address: string) => void;
}

const LocationPickerModal = ({ visible, onClose, onConfirm }: LocationPickerProps) => {
  const [currentLat, setCurrentLat] = useState(19.076);
  const [currentLng, setCurrentLng] = useState(72.8777);
  const [addressText, setAddressText] = useState("Tap on map to select location");
  const [locating, setLocating] = useState(false);
  const [webViewKey, setWebViewKey] = useState(0);
  const webViewRef = React.useRef<any>(null);

  useEffect(() => {
    if (visible) getUserLocation();
  }, [visible]);

  const getUserLocation = async () => {
    try {
      setLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") { setLocating(false); return; }
      const loc = await Location.getCurrentPositionAsync({});
      setCurrentLat(loc.coords.latitude);
      setCurrentLng(loc.coords.longitude);
      setWebViewKey(k => k + 1); // reload map to new center
      setLocating(false);
    } catch { setLocating(false); }
  };

  // HTML for OpenStreetMap via Leaflet (completely free!)
  const mapHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { height: 100%; width: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map').setView([${currentLat}, ${currentLng}], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map);

    var marker = L.marker([${currentLat}, ${currentLng}], {draggable: true}).addTo(map);

    function onLocationSelected(lat, lng) {
      fetch('https://nominatim.openstreetmap.org/reverse?format=json&lat=' + lat + '&lon=' + lng)
        .then(r => r.json())
        .then(data => {
          var addr = data.display_name || (lat.toFixed(4) + ', ' + lng.toFixed(4));
          window.ReactNativeWebView.postMessage(JSON.stringify({ lat, lng, address: addr }));
        })
        .catch(() => {
          window.ReactNativeWebView.postMessage(JSON.stringify({ lat, lng, address: lat.toFixed(4) + ', ' + lng.toFixed(4) }));
        });
    }

    marker.on('dragend', function(e) {
      var pos = e.target.getLatLng();
      onLocationSelected(pos.lat, pos.lng);
    });

    map.on('click', function(e) {
      marker.setLatLng(e.latlng);
      onLocationSelected(e.latlng.lat, e.latlng.lng);
    });

    // Send initial position
    onLocationSelected(${currentLat}, ${currentLng});
  </script>
</body>
</html>`;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      setAddressText(data.address);
    } catch {}
  };

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }}>
        {/* Header */}
        <View style={mapStyles.header}>
          <TouchableOpacity onPress={onClose} style={mapStyles.closeBtn}>
            <Ionicons name="close" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={mapStyles.title}>Select Location</Text>
          <TouchableOpacity onPress={getUserLocation} style={mapStyles.locateBtn}>
            {locating
              ? <ActivityIndicator size="small" color="#059669" />
              : <Ionicons name="locate" size={20} color="#059669" />
            }
          </TouchableOpacity>
        </View>

        {/* OpenStreetMap WebView */}
        <WebView
          key={webViewKey}
          ref={webViewRef}
          source={{ html: mapHTML }}
          style={{ flex: 1 }}
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          renderLoading={() => (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              <ActivityIndicator size="large" color="#059669" />
              <Text style={{ marginTop: 10, color: "#6B7280" }}>Loading map...</Text>
            </View>
          )}
        />

        {/* Bottom confirm sheet */}
        <View style={mapStyles.bottomSheet}>
          <View style={mapStyles.addressRow}>
            <Ionicons name="location" size={20} color="#059669" />
            <Text style={mapStyles.addressText} numberOfLines={2}>{addressText}</Text>
          </View>
          <TouchableOpacity
            style={mapStyles.confirmBtn}
            onPress={() => onConfirm(addressText)}
          >
            <Text style={mapStyles.confirmBtnText}>Confirm Location</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const mapStyles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderColor: "#F1F5F9" },
  closeBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center" },
  locateBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#ECFDF5", justifyContent: "center", alignItems: "center" },
  title: { fontSize: 16, fontWeight: "700", color: "#111827" },
  bottomSheet: { padding: 20, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderColor: "#F1F5F9" },
  addressRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 16, backgroundColor: "#F9FAFB", padding: 12, borderRadius: 12 },
  addressText: { flex: 1, fontSize: 13, color: "#111827", fontWeight: "500", lineHeight: 20 },
  confirmBtn: { backgroundColor: "#059669", paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  confirmBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
});

// ============================================================
// 💳 TYPES
// ============================================================

interface PaymentSimulationState {
  stage: "idle" | "otp" | "processing" | "success" | "error";
}

interface PaymentMethod {
  id: string;
  name: string;
  type: "card" | "upi" | "googlepay" | "paypal";
  details?: {
    cardNumber?: string;
    cardHolder?: string;
    expiry?: string;
    cvv?: string;
    upiId?: string;
  };
}

// ============================================================
// 🛒 MAIN CHECKOUT SCREEN
// ============================================================

export default function CheckoutScreen() {
  const { cart, clearCart } = useCart();
  const router = useRouter();
  const params = useLocalSearchParams();

  const [address, setAddress] = useState("");
  const [savedAddresses, setSavedAddresses] = useState<string[]>([]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"Online" | "COD">("Online");
  const [loading, setLoading] = useState(false);
  const [processStep, setProcessStep] = useState<1 | 2 | 3>(1);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);   // ← WAPAS LAAYA

  const [paymentSimulation, setPaymentSimulation] = useState<PaymentSimulationState>({ stage: "idle" });
  const [otpValue, setOtpValue] = useState("");
  const [otpError, setOtpError] = useState("");
  const [processingProgress] = useState(new Animated.Value(0));
  const [orderId, setOrderId] = useState("");

  const paymentMethods: PaymentMethod[] = [
    {
      id: "card1", name: "Credit Card", type: "card",
      details: { cardNumber: "4568 •••• •••• 5204", cardHolder: "Saniya & Aniket", expiry: "12/25", cvv: "***" }
    },
    { id: "upi1", name: "UPI", type: "upi", details: { upiId: "SA1201@kotak" } },
    { id: "gpay", name: "Google Pay", type: "googlepay" },
    { id: "paypal", name: "PayPal", type: "paypal" },
  ];

  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (paymentSimulation.stage !== "idle") return true;
      router.back();
      return true;
    });
    return () => backHandler.remove();
  }, [paymentSimulation.stage]);

  useEffect(() => {
    if (params.selectedAddress) setAddress(params.selectedAddress.toString());
    fetchSavedAddresses();
  }, [params.selectedAddress]);

  const fetchSavedAddresses = async () => {
    const mocked = [
      "123 Main Street, Virar West, Mumbai 401303",
      "45 MG Road, Andheri East, Mumbai 400069",
    ];
    setSavedAddresses(mocked);
    if (!params.selectedAddress && !address) setAddress(mocked[0]);
  };

  const total = cart.reduce((sum, item: CartItem) => sum + (Number(item.finalPrice || 0) * (item.quantity || 0)), 0);
  const finalTotal = total;

  // ============================================================
  // 🎮 PAYMENT SIMULATION
  // ============================================================

  const startPaymentSimulation = () => {
    if (!selectedPaymentMethod) {
      Alert.alert("Select Payment Method", "Please select a payment method");
      return;
    }
    setOrderId("ORD-" + Date.now());
    setPaymentSimulation({ stage: "otp" });
    setOtpValue("");
    setOtpError("");
  };

  const handleOtpSubmit = () => {
    if (otpValue.length !== 6) { setOtpError("OTP must be 6 digits"); return; }
    setPaymentSimulation({ stage: "processing" });
    setProcessStep(3);
    processingProgress.setValue(0);
    Animated.timing(processingProgress, {
      toValue: 1, duration: 3000, easing: Easing.ease, useNativeDriver: false,
    }).start();
    setTimeout(() => {
      if (Math.random() < 0.95) {
        setPaymentSimulation({ stage: "success" });
        setTimeout(() => {
          clearCart(); setLoading(false);
          Alert.alert("Success! 🎉", `Order placed!\nOrder ID: ${orderId}`);
          setPaymentSimulation({ stage: "idle" });
          router.replace("/customer/(tabs)/cart" as any);
        }, 2000);
      } else {
        setPaymentSimulation({ stage: "error" });
        setTimeout(() => { setPaymentSimulation({ stage: "idle" }); setLoading(false); }, 2000);
      }
    }, 3000);
  };

  const handlePlaceOrder = () => {
    if (!address.trim()) return Alert.alert("Missing Address", "Please select a delivery address.");
    if (paymentMode === "Online" && !selectedPaymentMethod)
      return Alert.alert("Select Payment Method", "Please select a payment method.");
    setLoading(true);
    setProcessStep(2);
    if (paymentMode === "Online") {
      startPaymentSimulation();
    } else {
      setProcessStep(3);
      setTimeout(() => {
        Alert.alert("Success! 🎉", "Order placed with Cash on Delivery");
        clearCart(); setLoading(false); setProcessStep(1);
        router.replace("/customer/(tabs)/cart" as any);
      }, 1000);
    }
  };

  // ============================================================
  // 🖼️ HELPERS
  // ============================================================

  const getPaymentIcon = (type: PaymentMethod["type"], size = 44) => {
    switch (type) {
      case "card":     return <CreditCardIcon size={size} />;
      case "upi":      return <UPIIcon size={size} />;
      case "googlepay":return <GooglePayIcon size={size} />;
      case "paypal":   return <PayPalIcon size={size} />;
    }
  };

  const renderTimeline = () => (
    <View style={styles.timelineContainer}>
      <View style={styles.timelineConnectorBg} />
      <View style={styles.timelineSteps}>
        {([{id:1,name:"Cart"},{id:2,name:"Payment"},{id:3,name:"Confirmation"}] as const).map((step) => (
          <View key={step.id} style={styles.timelineStepWrapper}>
            <View style={[styles.timelineStepCircle, step.id <= processStep && styles.timelineStepCircleActive]}>
              {step.id < processStep
                ? <Ionicons name="checkmark" size={18} color="#FFF" />
                : <Text style={[styles.timelineStepText, step.id === processStep && {color:"#FFF"}]}>{step.id}</Text>
              }
            </View>
            <Text style={[styles.timelineStepLabel, step.id <= processStep && styles.timelineStepLabelActive]}>
              {step.name}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  // ---- Payment Method Card (click → open detail modal) ----
  const PaymentMethodCard = ({ method }: { method: PaymentMethod }) => {
    const isSelected = selectedPaymentMethod?.id === method.id;
    return (
      <TouchableOpacity
        style={[styles.payMethodCard, isSelected && styles.payMethodCardActive]}
        onPress={() => {
          setSelectedPaymentMethod(method);
          setShowPaymentDetails(true);   // ← opens detail modal
        }}
        activeOpacity={0.8}
      >
        {getPaymentIcon(method.type, 44)}
        <View style={styles.payMethodInfo}>
          <Text style={styles.payMethodName}>{method.name}</Text>
          {method.details?.cardNumber && <Text style={styles.payMethodSubtext}>{method.details.cardNumber}</Text>}
          {method.details?.upiId && <Text style={styles.payMethodSubtext}>{method.details.upiId}</Text>}
        </View>
        <View style={[styles.payMethodRadio, isSelected && styles.payMethodRadioActive]}>
          {isSelected && <View style={styles.payMethodRadioDot} />}
        </View>
      </TouchableOpacity>
    );
  };

  // ============================================================
  // 📋 PAYMENT DETAIL MODAL (card form / upi / wallet info)
  // ============================================================
  const renderPaymentDetailsModal = () => (
    <Modal visible={showPaymentDetails} animationType="slide" transparent>
      <SafeAreaView style={styles.detailsModalContainer}>
        <View style={styles.detailsModalHeader}>
          <TouchableOpacity onPress={() => setShowPaymentDetails(false)}>
            <Ionicons name="close" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.detailsModalTitle}>Payment Details</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={{ flex: 1, padding: 20 }} showsVerticalScrollIndicator={false}>

          {/* CREDIT CARD */}
          {selectedPaymentMethod?.type === "card" && (
            <View style={styles.cardDetailsForm}>
              {/* Card preview */}
              <View style={styles.cardPreview}>
                <CreditCardIcon size={32} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.cardPreviewNumber}>{selectedPaymentMethod.details?.cardNumber}</Text>
                  <Text style={styles.cardPreviewHolder}>{selectedPaymentMethod.details?.cardHolder}</Text>
                </View>
                <Text style={styles.cardPreviewExpiry}>{selectedPaymentMethod.details?.expiry}</Text>
              </View>

              <Text style={styles.formLabel}>Cardholder Name</Text>
              <TextInput style={styles.formInput} defaultValue={selectedPaymentMethod.details?.cardHolder} editable={false} />

              <Text style={styles.formLabel}>Card Number</Text>
              <TextInput style={styles.formInput} defaultValue={selectedPaymentMethod.details?.cardNumber} editable={false} />

              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Expiry</Text>
                  <TextInput style={styles.formInput} defaultValue={selectedPaymentMethod.details?.expiry} editable={false} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>CVV</Text>
                  <TextInput style={styles.formInput} defaultValue={selectedPaymentMethod.details?.cvv} editable={false} secureTextEntry />
                </View>
              </View>

              <View style={styles.saveCardRow}>
                <Ionicons name="checkbox" size={20} color="#059669" />
                <Text style={styles.saveCardText}>Save this card for future transactions</Text>
              </View>
            </View>
          )}

          {/* UPI */}
          {selectedPaymentMethod?.type === "upi" && (
            <View style={styles.walletCenter}>
              <View style={[styles.walletIconBox, { backgroundColor: "#F3E8FF" }]}>
                <UPIIcon size={52} />
              </View>
              <Text style={styles.walletTitle}>UPI Payment</Text>
              <Text style={styles.walletSub}>Pay directly from your bank account</Text>
              <Text style={styles.formLabel}>UPI ID</Text>
              <TextInput style={[styles.formInput, { width: "100%", textAlign: "center" }]}
                defaultValue={selectedPaymentMethod.details?.upiId} editable={false} />
              <View style={styles.upiNote}>
                <Ionicons name="information-circle" size={16} color="#8B5CF6" />
                <Text style={styles.upiNoteText}>You will receive an OTP on your registered number</Text>
              </View>
            </View>
          )}

          {/* GOOGLE PAY */}
          {selectedPaymentMethod?.type === "googlepay" && (
            <View style={styles.walletCenter}>
              <View style={styles.walletIconBox}>
                <GooglePayIcon size={56} />
              </View>
              <Text style={styles.walletTitle}>Google Pay</Text>
              <Text style={styles.walletSub}>Fast and secure via your Google account</Text>
              {["One-tap checkout", "Secured by Google", "No additional fees"].map((t, i) => (
                <View key={i} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={18} color="#059669" />
                  <Text style={styles.featureText}>{t}</Text>
                </View>
              ))}
            </View>
          )}

          {/* PAYPAL */}
          {selectedPaymentMethod?.type === "paypal" && (
            <View style={styles.walletCenter}>
              <View style={styles.walletIconBox}>
                <PayPalIcon size={56} />
              </View>
              <Text style={styles.walletTitle}>PayPal</Text>
              <Text style={styles.walletSub}>Secure international payment</Text>
              {["Buyer Protection", "Global Payment", "Easy Refunds"].map((t, i) => (
                <View key={i} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={18} color="#059669" />
                  <Text style={styles.featureText}>{t}</Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[styles.payBtn, { marginTop: 24, marginBottom: 20 }]}
            onPress={() => setShowPaymentDetails(false)}
          >
            <Text style={styles.payBtnText}>Confirm & Continue</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  // ============================================================
  // 🖥️ MAIN RENDER
  // ============================================================

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={{ width: 44 }} />
        </View>

        {renderTimeline()}

        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* ORDER SUMMARY */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            <View style={styles.glassCard}>
              {cart.map((item: CartItem, index) => (
                <View key={index}>
                  <View style={styles.itemRow}>
                    <View>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                    </View>
                    <Text style={styles.itemPrice}>₹{(Number(item.finalPrice || 0) * (item.quantity || 0)).toFixed(0)}</Text>
                  </View>
                  {index < cart.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          </View>

          {/* DELIVERY ADDRESS */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery Address</Text>
            <TouchableOpacity style={styles.addressPickerCard} onPress={() => setShowAddressModal(true)}>
              <View style={styles.addressIconCircle}>
                <Ionicons name="location" size={24} color="#059669" />
              </View>
              <View style={styles.addressContent}>
                <Text style={styles.addressHeader}>Delivering To</Text>
                <Text style={styles.addressMain} numberOfLines={1}>
                  {address || "Select delivery address"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* PAYMENT MODE */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Mode</Text>
            <View style={styles.paymentModeContainer}>
              <TouchableOpacity style={[styles.payOption, paymentMode === "Online" && styles.activePay]}
                onPress={() => setPaymentMode("Online")}>
                <View style={[styles.payCheckbox, paymentMode === "Online" && styles.payCheckboxActive]}>
                  {paymentMode === "Online" && <Ionicons name="checkmark" size={14} color="#FFF" />}
                </View>
                <CreditCardIcon size={28} />
                <View style={styles.payTextContainer}>
                  <Text style={styles.payTitle}>Online Payment</Text>
                  <Text style={styles.payDescription}>Card, UPI, Wallet</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.payOption, paymentMode === "COD" && styles.activePay]}
                onPress={() => setPaymentMode("COD")}>
                <View style={[styles.payCheckbox, paymentMode === "COD" && styles.payCheckboxActive]}>
                  {paymentMode === "COD" && <Ionicons name="checkmark" size={14} color="#FFF" />}
                </View>
                <CODIcon size={28} />
                <View style={styles.payTextContainer}>
                  <Text style={styles.payTitle}>Cash on Delivery</Text>
                  <Text style={styles.payDescription}>Pay when you receive</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* PAYMENT METHODS */}
          {paymentMode === "Online" && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Payment Method</Text>
              <View style={styles.paymentMethodsContainer}>
                {paymentMethods.map((method) => <PaymentMethodCard key={method.id} method={method} />)}
              </View>
            </View>
          )}

          {/* PRICE */}
          <View style={styles.section}>
            <View style={styles.glassCard}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Subtotal</Text>
                <Text style={styles.priceValue}>₹{total.toFixed(0)}</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Shipping</Text>
                <Text style={[styles.priceValue, { color: "#059669" }]}>FREE</Text>
              </View>
              <View style={styles.priceDivider} />
              <View style={styles.priceRow}>
                <Text style={styles.priceTotalLabel}>Total Amount</Text>
                <Text style={styles.priceTotalValue}>₹{finalTotal.toFixed(0)}</Text>
              </View>
            </View>
          </View>

          <View style={{ height: 110 }} />
        </ScrollView>

        {/* FOOTER */}
        <View style={styles.footer}>
          <View>
            <Text style={styles.footerLabel}>Total</Text>
            <Text style={styles.footerPrice}>₹{finalTotal.toFixed(0)}</Text>
          </View>
          <TouchableOpacity style={[styles.payBtn, loading && styles.payBtnDisabled]}
            onPress={handlePlaceOrder} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#FFF" />
              : <Text style={styles.payBtnText}>{paymentMode === "Online" ? "Pay Now" : "Place Order"}</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ── ADDRESS MODAL ───────────────────────────────────── */}
      <Modal visible={showAddressModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Address</Text>
              <TouchableOpacity onPress={() => setShowAddressModal(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <Text style={styles.addrSectionLabel}>Saved Addresses</Text>
            {savedAddresses.map((item, index) => (
              <View key={index} style={styles.savedAddrCard}>
                <View style={styles.savedAddrHeader}>
                  <Ionicons name="location" size={18} color="#059669" />
                  <Text style={styles.savedAddrLabel}>{index === 0 ? "🏠 Home" : "🏢 Office"}</Text>
                  {address === item && (
                    <View style={styles.selectedBadge}><Text style={styles.selectedText}>SELECTED</Text></View>
                  )}
                </View>
                <Text style={styles.savedAddrText}>{item}</Text>
                <TouchableOpacity style={styles.deliverHereBtn}
                  onPress={() => { setAddress(item); setShowAddressModal(false); }}>
                  <Text style={styles.deliverHereText}>Deliver Here</Text>
                </TouchableOpacity>
              </View>
            ))}

            {/* Select on Map */}
            <TouchableOpacity style={styles.mapPickerBtn}
              onPress={() => { setShowAddressModal(false); setShowMapPicker(true); }}>
              <View style={styles.mapPickerIcon}>
                <Ionicons name="map" size={22} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mapPickerTitle}>Select on Map</Text>
                <Text style={styles.mapPickerSub}>OpenStreetMap — tap to pick exact location</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.addNewAddr}>
              <Ionicons name="add-circle" size={22} color="#059669" />
              <Text style={styles.addNewText}>Add New Address</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MAP PICKER ──────────────────────────────────────── */}
      <LocationPickerModal
        visible={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onConfirm={(addr) => { setAddress(addr); setShowMapPicker(false); }}
      />

      {/* ── PAYMENT DETAILS MODAL ───────────────────────────── */}
      {renderPaymentDetailsModal()}

      {/* ── OTP ─────────────────────────────────────────────── */}
      <Modal visible={paymentSimulation.stage === "otp"} animationType="fade" transparent>
        <View style={styles.paymentOverlay}>
          <View style={styles.paymentCard}>
            <View style={styles.paymentHeader}>
              <View style={styles.paymentIconBox}>
                <Ionicons name="lock-closed" size={32} color="#059669" />
              </View>
              <Text style={styles.paymentTitle}>Verify Payment</Text>
              <Text style={styles.paymentSubtitle}>Enter the 6-digit OTP sent to your number</Text>
            </View>
            <Text style={styles.otpLabel}>One-Time Password</Text>
            <TextInput
              style={[styles.otpInput, otpError && styles.otpInputError]}
              placeholder="000000" maxLength={6} keyboardType="numeric"
              value={otpValue} onChangeText={(t) => { setOtpValue(t); setOtpError(""); }}
            />
            {otpError && <Text style={styles.errorText}>{otpError}</Text>}
            <TouchableOpacity style={styles.verifyBtn} onPress={handleOtpSubmit}>
              <Text style={styles.verifyBtnText}>Verify & Pay ₹{finalTotal.toFixed(0)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn}
              onPress={() => { setPaymentSimulation({ stage: "idle" }); setLoading(false); }}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── PROCESSING ──────────────────────────────────────── */}
      <Modal visible={paymentSimulation.stage === "processing"} animationType="fade" transparent>
        <View style={styles.paymentOverlay}>
          <View style={styles.paymentCard}>
            <Text style={[styles.paymentTitle, { textAlign: "center" }]}>Processing Payment</Text>
            <Text style={[styles.paymentSubtitle, { textAlign: "center", marginBottom: 20 }]}>Please wait...</Text>
            <View style={styles.progressBarContainer}>
              <Animated.View style={[styles.progressBar, {
                width: processingProgress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
              }]} />
            </View>
            <View style={styles.processingDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Method</Text>
                <Text style={styles.detailValue}>{selectedPaymentMethod?.name}</Text>
              </View>
              <View style={styles.detailDivider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Amount</Text>
                <Text style={styles.detailValue}>₹{finalTotal.toFixed(0)}</Text>
              </View>
            </View>
            <ActivityIndicator size="large" color="#059669" style={{ marginTop: 20 }} />
          </View>
        </View>
      </Modal>

      {/* ── SUCCESS ─────────────────────────────────────────── */}
      <Modal visible={paymentSimulation.stage === "success"} animationType="fade" transparent>
        <View style={styles.paymentOverlay}>
          <View style={[styles.paymentCard, { alignItems: "center" }]}>
            <Ionicons name="checkmark-circle" size={80} color="#059669" style={{ marginBottom: 16 }} />
            <Text style={styles.paymentTitle}>Payment Successful!</Text>
            <Text style={styles.paymentSubtitle}>Your order has been placed</Text>
            <View style={[styles.processingDetails, { marginTop: 20, width: "100%" }]}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Order ID</Text>
                <Text style={styles.detailValue}>#{orderId.slice(-8).toUpperCase()}</Text>
              </View>
              <View style={styles.detailDivider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Amount</Text>
                <Text style={styles.detailValue}>₹{finalTotal.toFixed(0)}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 14 }}>Redirecting...</Text>
          </View>
        </View>
      </Modal>

      {/* ── ERROR ───────────────────────────────────────────── */}
      <Modal visible={paymentSimulation.stage === "error"} animationType="fade" transparent>
        <View style={styles.paymentOverlay}>
          <View style={[styles.paymentCard, { alignItems: "center" }]}>
            <Ionicons name="close-circle" size={80} color="#EF4444" style={{ marginBottom: 16 }} />
            <Text style={[styles.paymentTitle, { color: "#EF4444" }]}>Payment Failed</Text>
            <Text style={styles.paymentSubtitle}>Unable to process your transaction</Text>
            <View style={styles.errorMessage}>
              <Text style={styles.errorMessageText}>Please check your details and try again</Text>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// ============================================================
// 📐 STYLES
// ============================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderColor: "#F1F5F9" },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#F8FAFC", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#F1F5F9" },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#111827" },
  scrollContent: { padding: 18 },

  // Timeline
  timelineContainer: { paddingHorizontal: 20, paddingVertical: 20, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderColor: "#F1F5F9" },
  timelineConnectorBg: { position: "absolute", top: 40, left: "16.66%", right: "16.66%", height: 2, backgroundColor: "#E5E7EB" },
  timelineSteps: { flexDirection: "row", justifyContent: "space-around" },
  timelineStepWrapper: { alignItems: "center", zIndex: 1 },
  timelineStepCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#E5E7EB", backgroundColor: "#FFFFFF", marginBottom: 8 },
  timelineStepCircleActive: { backgroundColor: "#059669", borderColor: "#059669" },
  timelineStepText: { fontSize: 16, fontWeight: "700", color: "#9CA3AF" },
  timelineStepLabel: { fontSize: 12, fontWeight: "600", color: "#9CA3AF" },
  timelineStepLabelActive: { color: "#059669", fontWeight: "700" },

  // Section
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: "800", marginBottom: 12, color: "#64748B", textTransform: "uppercase", letterSpacing: 1 },
  glassCard: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 18, borderWidth: 1, borderColor: "#F1F5F9" },
  itemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  itemName: { fontSize: 15, fontWeight: "700", color: "#111827" },
  itemQuantity: { fontSize: 12, color: "#9CA3AF", marginTop: 3 },
  itemPrice: { fontSize: 15, fontWeight: "800", color: "#111827" },
  divider: { height: 1, backgroundColor: "#F1F5F9" },

  // Address
  addressPickerCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", padding: 16, borderRadius: 18, borderWidth: 1, borderColor: "#E5E7EB", gap: 12 },
  addressIconCircle: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#ECFDF5", justifyContent: "center", alignItems: "center" },
  addressContent: { flex: 1 },
  addressHeader: { fontSize: 11, color: "#9CA3AF", fontWeight: "700", textTransform: "uppercase" },
  addressMain: { fontSize: 14, color: "#111827", fontWeight: "700", marginTop: 2 },

  // Payment Mode
  paymentModeContainer: { gap: 12 },
  payOption: { backgroundColor: "#FFFFFF", padding: 16, borderRadius: 18, borderWidth: 2, borderColor: "#F3F4F6", flexDirection: "row", alignItems: "center", gap: 12 },
  activePay: { borderColor: "#059669", backgroundColor: "#F0FDF4" },
  payCheckbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: "#E5E7EB", justifyContent: "center", alignItems: "center" },
  payCheckboxActive: { backgroundColor: "#059669", borderColor: "#059669" },
  payTextContainer: { flex: 1 },
  payTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  payDescription: { fontSize: 12, color: "#6B7280", marginTop: 2 },

  // Payment Methods
  paymentMethodsContainer: { gap: 10 },
  payMethodCard: { backgroundColor: "#FFFFFF", padding: 14, borderRadius: 16, borderWidth: 2, borderColor: "#F3F4F6", flexDirection: "row", alignItems: "center", gap: 12 },
  payMethodCardActive: { borderColor: "#059669", backgroundColor: "#F0FDF4" },
  payMethodInfo: { flex: 1 },
  payMethodName: { fontSize: 15, fontWeight: "700", color: "#111827" },
  payMethodSubtext: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  payMethodRadio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#E5E7EB", justifyContent: "center", alignItems: "center" },
  payMethodRadioActive: { borderColor: "#059669" },
  payMethodRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#059669" },

  // Price
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  priceLabel: { fontSize: 14, color: "#6B7280", fontWeight: "500" },
  priceValue: { fontSize: 14, color: "#111827", fontWeight: "700" },
  priceDivider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 8 },
  priceTotalLabel: { fontSize: 16, color: "#111827", fontWeight: "800" },
  priceTotalValue: { fontSize: 18, color: "#059669", fontWeight: "900" },

  // Footer
  footer: { position: "absolute", bottom: 0, width: "100%", backgroundColor: "#FFFFFF", paddingVertical: 16, paddingHorizontal: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#F1F5F9", elevation: 20 },
  footerLabel: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
  footerPrice: { fontSize: 24, fontWeight: "900", color: "#111827" },
  payBtn: { backgroundColor: "#059669", paddingHorizontal: 32, paddingVertical: 14, borderRadius: 16, minWidth: 150, alignItems: "center" },
  payBtnDisabled: { opacity: 0.6 },
  payBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },

  // Address Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  addrSectionLabel: { fontSize: 12, color: "#9CA3AF", fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 },
  savedAddrCard: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 16, padding: 14, marginBottom: 12 },
  savedAddrHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  savedAddrLabel: { fontWeight: "700", fontSize: 14, color: "#111827", flex: 1 },
  selectedBadge: { backgroundColor: "#ECFDF5", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: "#A7F3D0" },
  selectedText: { fontSize: 10, color: "#059669", fontWeight: "800" },
  savedAddrText: { fontSize: 13, color: "#6B7280", lineHeight: 20, marginBottom: 12 },
  deliverHereBtn: { backgroundColor: "#059669", paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  deliverHereText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  mapPickerBtn: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 16, marginBottom: 12 },
  mapPickerIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: "#ECFDF5", justifyContent: "center", alignItems: "center" },
  mapPickerTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  mapPickerSub: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  addNewAddr: { flexDirection: "row", alignItems: "center", padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: "#F3F4F6", marginTop: 4 },
  addNewText: { color: "#059669", fontWeight: "700", fontSize: 14 },

  // Payment Detail Modal
  detailsModalContainer: { flex: 1, backgroundColor: "#FFFFFF" },
  detailsModalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderColor: "#F1F5F9" },
  detailsModalTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  cardDetailsForm: { gap: 14 },
  cardPreview: { flexDirection: "row", alignItems: "center", backgroundColor: "#F0FDF4", padding: 16, borderRadius: 14, marginBottom: 8, borderWidth: 1, borderColor: "#A7F3D0" },
  cardPreviewNumber: { fontSize: 14, fontWeight: "700", color: "#111827" },
  cardPreviewHolder: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  cardPreviewExpiry: { fontSize: 13, fontWeight: "600", color: "#059669" },
  formLabel: { fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 6 },
  formInput: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, padding: 14, fontSize: 14, color: "#111827", backgroundColor: "#F9FAFB" },
  saveCardRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, backgroundColor: "#F0FDF4", borderRadius: 12 },
  saveCardText: { fontSize: 13, color: "#059669", fontWeight: "600" },
  walletCenter: { alignItems: "center", paddingVertical: 20, gap: 10 },
  walletIconBox: { width: 80, height: 80, borderRadius: 20, backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center" },
  walletTitle: { fontSize: 20, fontWeight: "800", color: "#111827" },
  walletSub: { fontSize: 13, color: "#6B7280", textAlign: "center" },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10, alignSelf: "stretch", paddingHorizontal: 20 },
  featureText: { fontSize: 14, color: "#111827", fontWeight: "600" },
  upiNote: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#F3E8FF", padding: 12, borderRadius: 10, alignSelf: "stretch", marginHorizontal: 0 },
  upiNoteText: { fontSize: 12, color: "#7C3AED", flex: 1 },

  // Payment Modals
  paymentOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
  paymentCard: { backgroundColor: "#FFFFFF", borderRadius: 24, padding: 24, width: "100%", elevation: 10 },
  paymentHeader: { alignItems: "center", marginBottom: 24 },
  paymentIconBox: { width: 64, height: 64, borderRadius: 16, backgroundColor: "#ECFDF5", justifyContent: "center", alignItems: "center", marginBottom: 14 },
  paymentTitle: { fontSize: 20, fontWeight: "800", color: "#111827", marginBottom: 6 },
  paymentSubtitle: { fontSize: 13, color: "#6B7280" },
  otpLabel: { fontSize: 13, color: "#374151", fontWeight: "600", marginBottom: 12 },
  otpInput: { borderWidth: 2, borderColor: "#E5E7EB", borderRadius: 14, padding: 16, fontSize: 28, fontWeight: "700", letterSpacing: 8, textAlign: "center", color: "#111827", marginBottom: 8, backgroundColor: "#F9FAFB" },
  otpInputError: { borderColor: "#EF4444" },
  errorText: { color: "#EF4444", fontSize: 12, fontWeight: "600", marginBottom: 10 },
  verifyBtn: { backgroundColor: "#059669", paddingVertical: 15, borderRadius: 14, alignItems: "center", marginTop: 16, marginBottom: 10 },
  verifyBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },
  cancelBtn: { backgroundColor: "#F3F4F6", paddingVertical: 15, borderRadius: 14, alignItems: "center" },
  cancelBtnText: { color: "#374151", fontWeight: "700", fontSize: 15 },
  progressBarContainer: { width: "100%", height: 6, backgroundColor: "#E5E7EB", borderRadius: 3, overflow: "hidden", marginBottom: 20 },
  progressBar: { height: "100%", backgroundColor: "#059669", borderRadius: 3 },
  processingDetails: { backgroundColor: "#F9FAFB", borderRadius: 12, padding: 14 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  detailLabel: { fontSize: 13, color: "#6B7280" },
  detailValue: { fontSize: 13, color: "#111827", fontWeight: "700" },
  detailDivider: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 6 },
  errorMessage: { backgroundColor: "#FEF2F2", borderRadius: 12, padding: 14, width: "100%", borderWidth: 1, borderColor: "#FECACA", marginTop: 16 },
  errorMessageText: { fontSize: 13, color: "#DC2626", fontWeight: "600", textAlign: "center" },
});