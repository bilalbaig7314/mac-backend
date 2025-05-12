import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, Button, FlatList, Alert, SafeAreaView, TouchableOpacity, ScrollView, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as ImagePicker from 'expo-image-picker';
import { Audio, Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

// Base URL for Backend (Updated for Render)
const BASE_URL = 'https://mac-backend-ftga.onrender.com';

// Stack and Tab Navigators
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Login Screen (Unchanged)
function LoginScreen({ navigation, setCurrentUser }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      console.log('Login attempt:', { username, password });
      const response = await axios.post(`${BASE_URL}/api/users/login`, { username, password });
      console.log('Login response:', response.data);
      setCurrentUser(response.data);
      navigation.navigate('Main', { currentUser: response.data });
    } catch (error) {
      console.error('Login error:', error.response?.data?.message || error.message);
      Alert.alert('Error', error.response?.data?.message || 'Login failed');
    }
  };

  return (
    <LinearGradient colors={['#4B9FE1', '#A3DFFA']} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <Text style={styles.logoText}>✈️ MAC</Text>
        <Text style={styles.headerSubtitle}>Model Airplane Club</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Username</Text>
          <TextInput style={styles.input} placeholder="Enter username" value={username} onChangeText={setUsername} />
          <Text style={styles.label}>Password</Text>
          <TextInput style={styles.input} placeholder="Enter password" secureTextEntry value={password} onChangeText={setPassword} />
          <Button title="Login" onPress={handleLogin} color="#4CAF50" />
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.linkText}>Don't have an account? Register</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

// Registration Screen (Unchanged)
function RegisterScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async () => {
    try {
      console.log('Register attempt:', { username, email, password });
      const response = await axios.post(`${BASE_URL}/api/users/register`, { username, email, password });
      console.log('Register response:', response.data);
      Alert.alert('Success', 'Registration successful!');
      navigation.navigate('Login');
    } catch (error) {
      console.error('Register error:', error.response?.data?.message || error.message);
      Alert.alert('Error', error.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <LinearGradient colors={['#4B9FE1', '#A3DFFA']} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <Text style={styles.logoText}>✈️ MAC</Text>
        <Text style={styles.headerSubtitle}>Join Us</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Username</Text>
          <TextInput style={styles.input} placeholder="Enter username" value={username} onChangeText={setUsername} />
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} placeholder="Enter email" value={email} onChangeText={setEmail} />
          <Text style={styles.label}>Password</Text>
          <TextInput style={styles.input} placeholder="Enter password" secureTextEntry value={password} onChangeText={setPassword} />
          <Button title="Register" onPress={handleRegister} color="#4CAF50" />
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkText}>Already have an account? Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

// Home Screen (Fix fetchUsers to handle invalid user_ids)
function HomeScreen({ navigation, route }) {
  const currentUser = route.params?.currentUser || {};
  const [feed, setFeed] = useState([]);
  const [users, setUsers] = useState({});

  const fetchUsers = async (userIds) => {
    try {
      const validUserIds = userIds.filter(id => /^[0-9a-fA-F]{24}$/.test(id));
      const userPromises = validUserIds.map(async (userId) => {
        try {
          const response = await axios.get(`${BASE_URL}/api/users/${userId}`);
          return { [userId]: response.data.username };
        } catch (error) {
          console.error(`Error fetching user ${userId}:`, error);
          return { [userId]: 'Unknown User' };
        }
      });
      const userData = await Promise.all(userPromises);
      return Object.assign({}, ...userData);
    } catch (error) {
      console.error('Error fetching users:', error);
      return {};
    }
  };

  const fetchFeed = async () => {
    try {
      const [eventsRes, mediaRes, tipsRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/events`),
        axios.get(`${BASE_URL}/api/media`),
        axios.get(`${BASE_URL}/api/tips`),
      ]);
      const combinedFeed = [
        ...eventsRes.data.map(event => ({ ...event, type: 'event', user: 'JohnDoe' })),
        ...mediaRes.data.map(item => ({ ...item, type: 'media' })),
        ...tipsRes.data.map(tip => ({ ...tip, type: 'tip' })),
      ];

      const userIds = [...new Set(combinedFeed
        .filter(item => item.user_id && typeof item.user_id === 'string')
        .map(item => item.user_id))];
      const fetchedUsers = await fetchUsers(userIds);
      setUsers(fetchedUsers);
      setFeed(combinedFeed);
    } catch (error) {
      console.error('Error fetching feed:', error);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  return (
    <LinearGradient colors={['#4B9FE1', '#A3DFFA']} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <Text style={styles.logoText}>✈️ MAC</Text>
        <Text style={styles.headerSubtitle}>Welcome to the Flying Club</Text>
        <FlatList
          data={feed}
          keyExtractor={item => item._id?.toString() || Math.random().toString()}
          renderItem={({ item }) => (
            <View style={styles.feedCard}>
              {item.type === 'event' && (
                <>
                  <Text style={styles.feedTitle}>{item.name}</Text>
                  <Text style={styles.feedSubtitle}>Event on {item.date} by {item.user}</Text>
                  <Button title="View Details" onPress={() => navigation.navigate('EventDetails', { event: item, currentUser })} color="#4CAF50" />
                </>
              )}
              {item.type === 'media' && (
                <>
                  <Text style={styles.feedTitle}>{item.description}</Text>
                  <Text style={styles.feedSubtitle}>Posted by {users[item.user_id] || 'Unknown User'} ({item.privacy})</Text>
                  {item.url && item.url.endsWith('.mp4') ? (
                    <Video
                      source={{ uri: item.url }}
                      style={styles.feedImage}
                      useNativeControls
                      resizeMode="contain"
                      onError={(e) => console.log('Video load error:', e)}
                    />
                  ) : (
                    <Image
                      source={{ uri: item.url }}
                      style={styles.feedImage}
                      onError={(e) => console.log('Image load error:', e.nativeEvent.error)}
                    />
                  )}
                </>
              )}
              {item.type === 'tip' && (
                <>
                  <Text style={styles.feedTitle}>{item.category.replace('_', ' ')}</Text>
                  <Text style={styles.feedSubtitle}>Posted by {users[item.user_id] || 'Unknown User'}</Text>
                  <Text style={styles.feedContent}>{item.content}</Text>
                </>
              )}
            </View>
          )}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

// Events Screen
function EventsScreen({ navigation, route }) {
  const currentUser = route.currentUser || {};
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventAgenda, setEventAgenda] = useState('');
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/api/events`);
        setEvents(response.data);
      } catch (error) {
        console.error('Error fetching events:', error);
      }
    };
    fetchEvents();
  }, []);

  const addEvent = async () => {
    if (!eventName || !eventDate || !eventLocation || !eventAgenda) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    try {
      const response = await axios.post(`${BASE_URL}/api/events`, {
        name: eventName,
        date: eventDate,
        location: eventLocation,
        agenda: eventAgenda,
      });
      setEvents([...events, response.data]);
      setEventName('');
      setEventDate('');
      setEventLocation('');
      setEventAgenda('');
      Alert.alert('Success', 'Event added successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to add event');
    }
  };

  return (
    <LinearGradient colors={['#4B9FE1', '#A3DFFA']} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <Text style={styles.logoText}>✈️ Events</Text>
        <ScrollView>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Event Name</Text>
            <TextInput style={styles.input} placeholder="e.g., Airplane Meetup" value={eventName} onChangeText={setEventName} />
            <Text style={styles.label}>Event Date</Text>
            <TextInput style={styles.input} placeholder="e.g., 2025-05-01" value={eventDate} onChangeText={setEventDate} />
            <Text style={styles.label}>Location</Text>
            <TextInput style={styles.input} placeholder="e.g., Flying Field" value={eventLocation} onChangeText={setEventLocation} />
            <Text style={styles.label}>Agenda</Text>
            <TextInput style={styles.input} placeholder="e.g., Model Airplane Showcase" value={eventAgenda} onChangeText={setEventAgenda} />
            <Button title="Add Event" onPress={addEvent} color="#4CAF50" />
          </View>
          <FlatList
            data={events}
            keyExtractor={item => item._id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.eventCard} onPress={() => navigation.navigate('EventDetails', { event: item, currentUser })}>
                <Text style={styles.eventName}>{item.name}</Text>
                <Text style={styles.eventDate}>{item.date}</Text>
              </TouchableOpacity>
            )}
          />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

// Event Details Screen
function EventDetailsScreen({ route }) {
  const { event, currentUser } = route.params;
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [media, setMedia] = useState([]);
  const [selectedMedia, setSelectedMedia] = useState(null);

  useEffect(() => {
    const fetchMedia = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/api/media`);
        setMedia(response.data.filter(m => m.event_id === event._id));
      } catch (error) {
        console.error('Error fetching media:', error);
      }
    };

    fetchMedia();
  }, [event._id]);

  const pickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Error', 'Permission to access media library denied');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedMedia(result.assets[0]);
    }
  };

  const handleUploadMedia = async () => {
    if (!description || !selectedMedia) {
      Alert.alert('Error', 'Please add a description and select media');
      return;
    }

    const formData = new FormData();
    formData.append('media', {
      uri: selectedMedia.uri,
      type: selectedMedia.type === 'video' ? 'video/mp4' : 'image/jpeg',
      name: selectedMedia.uri.split('/').pop(),
    });
    formData.append('user_id', currentUser._id || '');
    formData.append('description', description);
    formData.append('event_id', event._id);
    formData.append('privacy', privacy);

    try {
      const response = await axios.post(`${BASE_URL}/api/media`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMedia([...media, response.data]);
      Alert.alert('Success', 'Media uploaded successfully!');
      setDescription('');
      setPrivacy('public');
      setSelectedMedia(null);
    } catch (error) {
      console.error('Media upload error:', error.response?.data || error.message);
      Alert.alert('Error', 'Failed to upload media');
    }
  };

  return (
    <LinearGradient colors={['#4B9FE1', '#A3DFFA']} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <Text style={styles.logoText}>✈️ Event Details</Text>
        <View style={styles.eventCard}>
          <Text style={styles.eventName}>{event.name}</Text>
          <Text style={styles.eventDate}>Date: {event.date}</Text>
          <Text style={styles.eventDetail}>Location: {event.location || 'Flying Field'}</Text>
          <Text style={styles.eventDetail}>Agenda: {event.agenda || 'Model Airplane Showcase'}</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Upload Media</Text>
            <TextInput style={styles.input} placeholder="Description" value={description} onChangeText={setDescription} />
            <Text style={styles.label}>Privacy</Text>
            <TextInput style={styles.input} placeholder="public or members_only" value={privacy} onChangeText={setPrivacy} />
            <Button title="Select Media" onPress={pickMedia} color="#4CAF50" />
            {selectedMedia && (
              <Text style={styles.placeholderText}>
                Selected: {selectedMedia.uri.split('/').pop()}
              </Text>
            )}
            <Button title="Upload Media" onPress={handleUploadMedia} color="#4CAF50" />
          </View>
          <FlatList
            data={media}
            keyExtractor={item => item._id.toString()}
            renderItem={({ item }) => (
              <View style={styles.feedCard}>
                <Text style={styles.feedTitle}>{item.description}</Text>
                <Text style={styles.feedSubtitle}>Privacy: {item.privacy}</Text>
                {item.url && item.url.endsWith('.mp4') ? (
                  <Video
                    source={{ uri: item.url }}
                    style={styles.feedImage}
                    useNativeControls
                    resizeMode="contain"
                    onError={(e) => console.log('Video load error:', e)}
                  />
                ) : (
                  <Image
                    source={{ uri: item.url }}
                    style={styles.feedImage}
                    onError={(e) => console.log('Image load error:', e.nativeEvent.error)}
                  />
                )}
              </View>
            )}
          />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

// Album Details Screen
function AlbumDetailsScreen({ route }) {
  const { albumItems } = route.params;

  return (
    <LinearGradient colors={['#4B9FE1', '#A3DFFA']} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <Text style={styles.logoText}>✈️ Album Details</Text>
        <FlatList
          data={albumItems}
          keyExtractor={item => item._id.toString()}
          renderItem={({ item }) => (
            <View style={styles.feedCard}>
              <Text style={styles.feedTitle}>{item.description}</Text>
              <Text style={styles.feedSubtitle}>Privacy: {item.privacy}</Text>
              {item.url && item.url.endsWith('.mp4') ? (
                <Video
                  source={{ uri: item.url }}
                  style={styles.feedImage}
                  useNativeControls
                  resizeMode="contain"
                  onError={(e) => console.log('Video load error:', e)}
                />
              ) : (
                <Image
                  source={{ uri: item.url }}
                  style={styles.feedImage}
                  onError={(e) => console.log('Image load error:', e.nativeEvent.error)}
                />
              )}
            </View>
          )}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

// Media Screen
function MediaScreen({ navigation, route }) {
  const currentUser = route.currentUser || {};
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [media, setMedia] = useState([]);
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [users, setUsers] = useState({});

  useEffect(() => {
    const fetchMedia = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/api/media`);
        const mediaData = response.data;
        const userIds = [...new Set(mediaData.map(item => item.user_id))];
        const userPromises = userIds.map(async (userId) => {
          try {
            const userResponse = await axios.get(`${BASE_URL}/api/users/${userId}`);
            return { [userId]: userResponse.data.username };
          } catch (error) {
            console.error(`Error fetching user ${userId}:`, error);
            return { [userId]: 'Unknown User' };
          }
        });
        const userData = await Promise.all(userPromises);
        setUsers(Object.assign({}, ...userData));
        setMedia(mediaData);
      } catch (error) {
        console.error('Error fetching media:', error);
      }
    };

    fetchMedia();
  }, []);

  const pickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Error', 'Permission to access media library denied');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 1,
      allowsMultipleSelection: true,
    });

    if (!result.canceled) {
      setSelectedMedia(prevSelected => [...prevSelected, ...result.assets]);
    }
  };

  const handleUploadMedia = async () => {
    if (!description || selectedMedia.length === 0) {
      Alert.alert('Error', 'Please add a description and select at least one media item');
      return;
    }

    const albumId = `${description}-${Date.now()}`;
    const uploadPromises = selectedMedia.map(async (mediaItem) => {
      const formData = new FormData();
      formData.append('media', {
        uri: mediaItem.uri,
        type: mediaItem.type === 'video' ? 'video/mp4' : 'image/jpeg',
        name: mediaItem.uri.split('/').pop(),
      });
      formData.append('user_id', currentUser._id || '');
      formData.append('description', description);
      formData.append('privacy', privacy);
      formData.append('albumId', albumId);

      try {
        const response = await axios.post(`${BASE_URL}/api/media`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return { ...response.data, albumId };
      } catch (error) {
        console.error('Upload error for item:', mediaItem.uri, error.response?.data || error.message);
        return null;
      }
    });

    const uploadedMedia = (await Promise.all(uploadPromises)).filter(item => item !== null);
    if (uploadedMedia.length > 0) {
      setMedia(prevMedia => [...prevMedia, ...uploadedMedia]);
      Alert.alert('Success', `${uploadedMedia.length} media item(s) uploaded successfully!`);
      setDescription('');
      setPrivacy('public');
      setSelectedMedia([]);
    } else {
      Alert.alert('Error', 'Failed to upload any media items');
    }
  };

  const groupedMedia = media.reduce((acc, item) => {
    const key = item.albumId || item._id;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {});

  const albums = Object.entries(groupedMedia).map(([albumId, items]) => ({
    albumId,
    description: items[0].description,
    privacy: items[0].privacy,
    thumbnail: items[0].url,
    items,
  }));

  return (
    <LinearGradient colors={['#4B9FE1', '#A3DFFA']} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <Text style={styles.logoText}>✈️ Media</Text>
        <ScrollView>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upload Photos/Videos</Text>
            <TextInput style={styles.input} placeholder="Description" value={description} onChangeText={setDescription} />
            <TextInput style={styles.input} placeholder="Privacy (public or members_only)" value={privacy} onChangeText={setPrivacy} />
            <Button title="Select Media" onPress={pickMedia} color="#4CAF50" />
            {selectedMedia.length > 0 && (
              <View>
                {selectedMedia.map((item, index) => (
                  <Text key={index} style={styles.placeholderText}>
                    Selected: {item.uri.split('/').pop()}
                  </Text>
                ))}
              </View>
            )}
            <Button title="Upload" onPress={handleUploadMedia} color="#4CAF50" />
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Event Galleries & Weekend Trips</Text>
            <FlatList
              data={albums}
              keyExtractor={item => item.albumId}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.albumCard}
                  onPress={() => navigation.navigate('AlbumDetails', { albumItems: item.items })}
                >
                  <Text style={styles.feedTitle}>{item.description}</Text>
                  <Text style={styles.feedSubtitle}>Posted by {users[item.items[0].user_id] || 'Unknown User'} | Privacy: {item.privacy} | Items: {item.items.length}</Text>
                  {item.thumbnail && (
                    item.thumbnail.endsWith('.mp4') ? (
                      <Video
                        source={{ uri: item.thumbnail }}
                        style={styles.feedImage}
                        useNativeControls
                        resizeMode="contain"
                        onError={(e) => console.log('Video load error:', e)}
                      />
                    ) : (
                      <Image
                        source={{ uri: item.thumbnail }}
                        style={styles.feedImage}
                        onError={(e) => console.log('Image load error:', e.nativeEvent.error)}
                      />
                    )
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

// Learning Screen
function LearningScreen({ route }) {
  const currentUser = route.currentUser || {};
  const [category, setCategory] = useState('tips_and_tricks');
  const [content, setContent] = useState('');
  const [tips, setTips] = useState([]);
  const [users, setUsers] = useState({});

  useEffect(() => {
    const fetchTips = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/api/tips`);
        const tipsData = response.data;
        const userIds = [...new Set(tipsData.map(tip => tip.user_id))];
        const userPromises = userIds.map(async (userId) => {
          try {
            const userResponse = await axios.get(`${BASE_URL}/api/users/${userId}`);
            return { [userId]: userResponse.data.username };
          } catch (error) {
            console.error(`Error fetching user ${userId}:`, error);
            return { [userId]: 'Unknown User' };
          }
        });
        const userData = await Promise.all(userPromises);
        setUsers(Object.assign({}, ...userData));
        setTips(tipsData);
      } catch (error) {
        console.error('Error fetching tips:', error);
      }
    };
    fetchTips();
  }, []);

  const handleAddTip = async () => {
    if (!content) {
      Alert.alert('Error', 'Please add content');
      return;
    }
    try {
      const response = await axios.post(`${BASE_URL}/api/tips`, {
        user_id: currentUser._id || '',
        category,
        content,
      });
      setTips([...tips, response.data]);
      setUsers(prevUsers => ({
        ...prevUsers,
        [currentUser._id || '']: currentUser.username || 'Unknown User',
      }));
      Alert.alert('Success', 'Tip added successfully!');
      setContent('');
    } catch (error) {
      console.error('Error adding tip:', error.response?.data || error.message);
      Alert.alert('Error', 'Failed to add tip');
    }
  };

  return (
    <LinearGradient colors={['#4B9FE1', '#A3DFFA']} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <Text style={styles.logoText}>✈️ Learning</Text>
        <ScrollView>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Add Tip or Tutorial</Text>
            <Text style={styles.label}>Category</Text>
            <TextInput style={styles.input} placeholder="tips_and_tricks or building_models" value={category} onChangeText={setCategory} />
            <Text style={styles.label}>Content</Text>
            <TextInput style={styles.input} placeholder="Enter your tip or tutorial" value={content} onChangeText={setContent} multiline />
            <Button title="Submit" onPress={handleAddTip} color="#4CAF50" />
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tips & Tutorials</Text>
            <FlatList
              data={tips}
              keyExtractor={item => item._id.toString()}
              renderItem={({ item }) => (
                <View style={styles.feedCard}>
                  <Text style={styles.feedTitle}>{item.category.replace('_', ' ')}</Text>
                  <Text style={styles.feedSubtitle}>Posted by {users[item.user_id] || 'Unknown User'}</Text>
                  <Text style={styles.feedContent}>{item.content}</Text>
                </View>
              )}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

// Profile Screen
function ProfileScreen({ route }) {
  const currentUser = route.params?.currentUser || {};
  const [profilePicture, setProfilePicture] = useState(currentUser.profile_picture || 'https://via.placeholder.com/100.png?text=Profile');
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        if (!currentUser.username || !currentUser.password) return;
        const response = await axios.post(`${BASE_URL}/api/users/login`, {
          username: currentUser.username,
          password: currentUser.password
        });
        const user = response.data;
        console.log('Fetched user data:', user);
        if (user._id) {
          route.params.currentUser = { ...currentUser, _id: user._id };
        }
        setProfilePicture(user.profile_picture || 'https://via.placeholder.com/100.png?text=Profile');
      } catch (error) {
        console.error('Error fetching user:', error.response?.data || error.message);
      }
    };
    fetchUser();
  }, [currentUser]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Error', 'Permission to access media library denied');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0]);
      setProfilePicture(result.assets[0].uri);
    }
  };

  const handleUploadProfilePicture = async () => {
    if (!selectedImage) {
      Alert.alert('Error', 'Please select an image');
      return;
    }

    if (!currentUser._id) {
      console.log('Current user object:', currentUser);
      Alert.alert('Error', 'User ID is missing. Please log in again.');
      return;
    }

    const formData = new FormData();
    formData.append('profile_picture', {
      uri: selectedImage.uri,
      type: 'image/jpeg',
      name: selectedImage.uri.split('/').pop()
    });

    try {
      const response = await axios.put(`${BASE_URL}/api/users/${currentUser._id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setProfilePicture(response.data.profile_picture);
      Alert.alert('Success', 'Profile picture updated successfully!');
      setSelectedImage(null);
    } catch (error) {
      console.error('Profile picture upload error:', error.response?.data || error.message);
      Alert.alert('Error', 'Failed to update profile picture');
    }
  };

  return (
    <LinearGradient colors={['#4B9FE1', '#A3DFFA']} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <Text style={styles.logoText}>✈️ Profile</Text>
        <ScrollView>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile Management</Text>
            <Text style={styles.usernameText}>Username: {currentUser.username || 'N/A'}</Text>
            <Image
              source={{ uri: profilePicture }}
              style={styles.profilePicture}
              onError={(e) => console.log('Profile picture load error:', e.nativeEvent.error)}
            />
            <Button title="Select Profile Picture" onPress={pickImage} color="#4CAF50" />
            <Button title="Upload Profile Picture" onPress={handleUploadProfilePicture} color="#4CAF50" />
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Communication</Text>
            <Button title="Member Directory" onPress={() => route.navigation.navigate('MemberDirectory')} color="#4CAF50" />
            <Button title="Direct Chat" onPress={() => route.navigation.navigate('Chat')} color="#4CAF50" />
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

// Member Directory Screen
function MemberDirectoryScreen() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.post(`${BASE_URL}/api/users/login`, {
          username: 'BilalBaig',
          password: 'Pakistan1947'
        });
        setUsers([response.data]);
      } catch (error) {
        console.error('Error fetching users:', error.response?.data || error.message);
      }
    };
    fetchUsers();
  }, []);

  return (
    <LinearGradient colors={['#4B9FE1', '#A3DFFA']} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <Text style={styles.logoText}>✈️ Member Directory</Text>
        <View style={styles.section}>
          <FlatList
            data={users}
            keyExtractor={item => item._id.toString()}
            renderItem={({ item }) => (
              <Text style={styles.placeholderText}>{item.username} - {item.email}</Text>
            )}
          />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

// Chat Screen
function ChatScreen() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/api/messages`);
        setMessages(response.data);
      } catch (error) {
        console.error('Error fetching messages:', error.response?.data || error.message);
      }
    };
    fetchMessages();
  }, []);

  const handleSendMessage = async () => {
    if (!message) return;
    try {
      const response = await axios.post(`${BASE_URL}/api/messages`, {
        user: 'BilalBaig',
        text: message
      });
      setMessages([...messages, response.data]);
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error.response?.data || error.message);
      Alert.alert('Error', 'Failed to send message');
    }
  };

  return (
    <LinearGradient colors={['#4B9FE1', '#A3DFFA']} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <Text style={styles.logoText}>✈️ Chat</Text>
        <FlatList
          data={messages}
          keyExtractor={item => item._id.toString()}
          renderItem={({ item }) => (
            <View style={styles.messageCard}>
              <Text style={styles.feedSubtitle}>{item.user}</Text>
              <Text style={styles.feedContent}>{item.text}</Text>
            </View>
          )}
        />
        <View style={styles.inputContainer}>
          <TextInput style={styles.input} placeholder="Type a message" value={message} onChangeText={setMessage} />
          <Button title="Send" onPress={handleSendMessage} color="#4CAF50" />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

// Main Tab Navigator
function MainTabs({ route }) {
  const currentUser = route.params?.currentUser || {};

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarStyle: { backgroundColor: '#4B9FE1' },
        tabBarActiveTintColor: '#FF5252',
        tabBarInactiveTintColor: 'white',
        tabBarIcon: ({ color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'Events') {
            iconName = 'calendar';
          } else if (route.name === 'Learning') {
            iconName = 'book';
          } else if (route.name === 'Profile') {
            iconName = 'person';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        }
      })}
    >
      <Tab.Screen name="Home">
        {props => <HomeScreen {...props} currentUser={currentUser} />}
      </Tab.Screen>
      <Tab.Screen name="Events">
        {props => <EventsScreen {...props} currentUser={currentUser} />}
      </Tab.Screen>
      <Tab.Screen name="Media">
        {props => <MediaScreen {...props} currentUser={currentUser} />}
      </Tab.Screen>
      <Tab.Screen name="Learning">
        {props => <LearningScreen {...props} currentUser={currentUser} />}
      </Tab.Screen>
      <Tab.Screen name="Profile">
        {props => <ProfileScreen {...props} currentUser={currentUser} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

// Main App
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" options={{ headerShown: false }}>
          {props => <LoginScreen {...props} setCurrentUser={setCurrentUser} />}
        </Stack.Screen>
        <Stack.Screen name="Register" options={{ headerShown: false }} component={RegisterScreen} />
        <Stack.Screen name="Main" options={{ headerShown: false }} component={MainTabs} />
        <Stack.Screen name="EventDetails" options={{ headerShown: false }} component={EventDetailsScreen} />
        <Stack.Screen name="AlbumDetails" options={{ headerShown: false }} component={AlbumDetailsScreen} />
        <Stack.Screen name="MemberDirectory" component={MemberDirectoryScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 20 },
  logoText: { fontSize: 36, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center', marginTop: 40, marginBottom: 10, textShadowColor: 'rgba(255, 255, 255, 0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 },
  headerSubtitle: { fontSize: 16, color: 'white', textAlign: 'center', fontStyle: 'italic', marginBottom: 20 },
  inputContainer: { backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 10, padding: 15, marginBottom: 20, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 5 },
  label: { fontSize: 16, fontWeight: 'bold', color: '#4B9FE1', marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#4B9FE1', borderRadius: 5, padding: 10, marginBottom: 15, backgroundColor: '#fff', fontSize: 16, color: '#333' },
  linkText: { color: '#4B9FE1', textAlign: 'center', marginTop: 10 },
  eventCard: { backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: 10, padding: 15, marginBottom: 10, elevation: 3 },
  eventName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  eventDate: { fontSize: 14, color: '#FF5252' },
  eventDetail: { fontSize: 14, color: '#333', marginTop: 5 },
  section: { backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 10, padding: 15, marginBottom: 10, elevation: 3 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#4B9FE1', marginBottom: 10 },
  placeholderText: { fontSize: 16, color: '#333' },
  albumCard: { backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: 10, padding: 15, marginBottom: 10, elevation: 3 },
  feedCard: { backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: 10, padding: 15, marginBottom: 10, elevation: 3 },
  feedTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  feedSubtitle: { fontSize: 14, color: '#666', marginBottom: 5 },
  feedContent: { fontSize: 16, color: '#333' },
  feedImage: { width: '100%', height: 200, borderRadius: 10, marginTop: 5 },
  profilePicture: { width: 100, height: 100, borderRadius: 50, alignSelf: 'center', marginBottom: 10 },
  messageCard: { backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: 10, padding: 10, marginBottom: 5, elevation: 2 },
  usernameText: { fontSize: 16, color: '#333', textAlign: 'center', marginBottom: 10 }
});