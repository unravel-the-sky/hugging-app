import AsyncStorage from "@react-native-async-storage/async-storage";

export const resetUser = async () => {
  await AsyncStorage.removeItem("displayName");
  await AsyncStorage.removeItem("userId");
};
