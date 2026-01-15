import TodoList from "./components/TodoList";

export default function App() {
  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 16 }}>
      <h1 style={{ marginBottom: 16 }}>To-Do List</h1>
      <TodoList />
    </div>
  );
}
