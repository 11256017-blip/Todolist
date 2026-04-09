import React, { useState, createContext, useContext } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, TextInput, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// --- 1. 全域狀態管理 (Context API) ---
const TodoContext = createContext();

const TodoProvider = ({ children }) => {
  const [todos, setTodos] = useState([
    { id: '1', text: '買牛奶', completed: false, categoryId: '個人', color: '#007AFF' },
    { id: '2', text: '寫 React Native 作業', completed: true, categoryId: '工作', color: '#34C759' },
    { id: '3', text: '打給媽媽', completed: false, categoryId: '個人', color: '#FF9500' },
  ]);

  const addTodo = (text, categoryId) => {
    const iosColors = ['#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF3B30'];
    const randomColor = iosColors[Math.floor(Math.random() * iosColors.length)];
    
    const newTodo = {
      id: Date.now().toString(),
      text,
      completed: false,
      categoryId,
      color: randomColor,
    };
    setTodos((prevTodos) => [newTodo, ...prevTodos]);
  };

  const deleteTodo = (id) => {
    setTodos((prevTodos) => prevTodos.filter((todo) => todo.id !== id));
  };

  const toggleTodo = (id) => {
    setTodos((prevTodos) =>
      prevTodos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const updateTodo = (id, newText) => {
    setTodos((prevTodos) =>
      prevTodos.map((todo) =>
        todo.id === id ? { ...todo, text: newText } : todo
      )
    );
  };

  return (
    <TodoContext.Provider value={{ todos, addTodo, deleteTodo, toggleTodo, updateTodo }}>
      {children}
    </TodoContext.Provider>
  );
};

// --- 2. 頁面一：分類首頁 (已加入新增按鈕與彈出視窗) ---
const HomeScreen = ({ navigation }) => {
  const { todos, addTodo } = useContext(TodoContext);

  // 首頁專用的彈出視窗狀態
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newTodoText, setNewTodoText] = useState('');

  const counts = {
    Today: todos.filter(t => !t.completed).length,
    Completed: todos.filter(t => t.completed).length,
  };

  const myLists = ['個人', '工作'];

  // 首頁確認新增 (預設加入到 '個人' 列表)
  const handleConfirmAdd = () => {
    if (newTodoText.trim()) {
      addTodo(newTodoText.trim(), '個人'); 
      setNewTodoText('');
      setIsModalVisible(false);
    }
  };

  const CategoryCard = ({ title, count, icon, color }) => (
    <TouchableOpacity
      style={styles.categoryCard}
      onPress={() => navigation.navigate('TodoList', { categoryId: title })}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.cardIcon, { color: color }]}>{icon}</Text>
        <Text style={styles.cardCount}>{count}</Text>
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.iosLargeTitle}>提醒事項</Text>
      
      <View style={styles.categoryGrid}>
        <CategoryCard title="今天" count={counts.Today} icon="📅" color="#007AFF" />
        <CategoryCard title="已完成" count={counts.Completed} icon="✅" color="#8E8E93" />
      </View>

      <Text style={styles.sectionHeader}>我的列表</Text>
      <FlatList
        data={myLists}
        keyExtractor={item => item}
        renderItem={({ item }) => {
          const listTodos = todos.filter(t => t.categoryId === item && !t.completed);
          return (
            <TouchableOpacity
              style={styles.listItem}
              onPress={() => navigation.navigate('TodoList', { categoryId: item })}
            >
              <View style={styles.listItemLeft}>
                <View style={[styles.listCircle, { backgroundColor: item === '工作' ? '#AF52DE' : '#007AFF' }]} />
                <Text style={styles.listItemText}>{item}</Text>
              </View>
              <Text style={styles.listItemCount}>{listTodos.length}</Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* --- 首頁底部新增按鈕 --- */}
      <TouchableOpacity style={styles.addButton} onPress={() => setIsModalVisible(true)}>
        <Text style={styles.addButtonText}>+ 新增提醒事項</Text>
      </TouchableOpacity>

      {/* --- 首頁專用的彈出視窗 --- */}
      <Modal visible={isModalVisible} transparent={true} animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>新增待辦事項</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="輸入內容 (將加入至'個人'列表)..."
              value={newTodoText}
              onChangeText={setNewTodoText}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalButton} onPress={() => setIsModalVisible(false)}>
                <Text style={styles.modalCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButton} onPress={handleConfirmAdd}>
                <Text style={styles.modalConfirmText}>加入</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

// --- 3. 頁面二：待辦列表頁 ---
const TodoListScreen = ({ route, navigation }) => {
  const { categoryId } = route.params;
  const { todos, toggleTodo, deleteTodo, addTodo, updateTodo } = useContext(TodoContext);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newTodoText, setNewTodoText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');

  const filteredTodos = todos.filter(t => {
    if (categoryId === '今天') return !t.completed;
    if (categoryId === '已完成') return t.completed;
    return t.categoryId === categoryId;
  });

  React.useLayoutEffect(() => {
    navigation.setOptions({ title: categoryId });
  }, [navigation, categoryId]);

  const saveEdit = (id) => {
    if (editingText.trim()) {
      updateTodo(id, editingText.trim());
    }
    setEditingId(null);
  };

  const handleConfirmAdd = () => {
    if (newTodoText.trim()) {
      const targetCategory = (categoryId === '今天' || categoryId === '已完成') ? '個人' : categoryId;
      addTodo(newTodoText.trim(), targetCategory);
      setNewTodoText('');
      setIsModalVisible(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.todoItem}>
      <TouchableOpacity onPress={() => toggleTodo(item.id)} style={styles.checkboxContainer}>
        <View style={[
          styles.iosCheckbox,
          { borderColor: item.color },
          item.completed && { backgroundColor: item.color }
        ]}>
          {item.completed && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>

      <View style={styles.todoTextContainer}>
        {editingId === item.id ? (
          <TextInput
            style={styles.todoInput}
            value={editingText}
            onChangeText={setEditingText}
            onBlur={() => saveEdit(item.id)}
            autoFocus
          />
        ) : (
          <TouchableOpacity onPress={() => { setEditingId(item.id); setEditingText(item.text); }}>
            <Text style={[styles.todoText, item.completed && styles.todoTextCompleted]}>
              {item.text}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={styles.deleteButton} onPress={() => deleteTodo(item.id)}>
        <Text style={styles.deleteButtonText}>🗑️</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.listContainer}>
      <FlatList
        data={filteredTodos}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      <TouchableOpacity style={styles.addButton} onPress={() => setIsModalVisible(true)}>
        <Text style={styles.addButtonText}>+ 新增提醒事項</Text>
      </TouchableOpacity>

      <Modal visible={isModalVisible} transparent={true} animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>新增至 {categoryId}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="輸入內容..."
              value={newTodoText}
              onChangeText={setNewTodoText}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalButton} onPress={() => setIsModalVisible(false)}>
                <Text style={styles.modalCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButton} onPress={handleConfirmAdd}>
                <Text style={styles.modalConfirmText}>加入</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

// --- 主程式進入點 ---
const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <TodoProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerBackTitleVisible: false }}>
          <Stack.Screen 
            name="Home" 
            component={HomeScreen} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="TodoList" 
            component={TodoListScreen} 
            options={{ headerLargeTitle: true }} 
          />
        </Stack.Navigator>
      </NavigationContainer>
    </TodoProvider>
  );
}

// --- 樣式設定 ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7', padding: 16, paddingTop: 60 },
  listContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  iosLargeTitle: { fontSize: 34, fontWeight: 'bold', marginBottom: 20, color: '#000' },
  
  categoryGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  categoryCard: { backgroundColor: '#FFF', flex: 1, marginHorizontal: 5, borderRadius: 12, padding: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardIcon: { fontSize: 24, fontWeight: 'bold' },
  cardCount: { fontSize: 24, fontWeight: 'bold', color: '#000' },
  cardTitle: { fontSize: 16, color: '#8E8E93', fontWeight: '500' },
  
  sectionHeader: { fontSize: 22, fontWeight: 'bold', marginTop: 10, marginBottom: 10, marginLeft: 5 },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 8, alignItems: 'center' },
  listItemLeft: { flexDirection: 'row', alignItems: 'center' },
  listCircle: { width: 30, height: 30, borderRadius: 15, marginRight: 12 },
  listItemText: { fontSize: 18 },
  listItemCount: { fontSize: 18, color: '#8E8E93' },

  todoItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  checkboxContainer: { marginRight: 12 },
  iosCheckbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  checkmark: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  todoTextContainer: { flex: 1 },
  todoText: { fontSize: 17, color: '#000' },
  todoTextCompleted: { color: '#8E8E93', textDecorationLine: 'line-through' },
  todoInput: { fontSize: 17, color: '#000', borderBottomWidth: 1, borderBottomColor: '#007AFF', paddingVertical: 4 },
  
  deleteButton: { padding: 8 },
  deleteButtonText: { fontSize: 20 },

  addButton: { position: 'absolute', bottom: 30, left: 20, flexDirection: 'row', alignItems: 'center' },
  addButtonText: { fontSize: 18, color: '#007AFF', fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: '#FFF', borderRadius: 14, padding: 20, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  modalInput: { width: '100%', borderWidth: 1, borderColor: '#CCC', borderRadius: 8, padding: 10, fontSize: 16, marginBottom: 20 },
  modalActions: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#E5E5EA', paddingTop: 10 },
  modalButton: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  modalCancelText: { color: '#FF3B30', fontSize: 16 },
  modalConfirmText: { color: '#007AFF', fontSize: 16, fontWeight: 'bold' },
});