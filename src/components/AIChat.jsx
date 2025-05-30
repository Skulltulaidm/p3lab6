import { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';

const AI_PROVIDERS = [
    { id: 'openai', name: 'OpenAI', models: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'] },
];

function AIChat() {
    // Estados
    const [provider, setProvider] = useState('openai');
    const [model, setModel] = useState('gpt-3.5-turbo');
    const [apiKey, setApiKey] = useState('');
    const [message, setMessage] = useState('');
    const [conversation, setConversation] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [error, setError] = useState(null);

    // Cargar configuración guardada
    useEffect(() => {
        const savedProvider = localStorage.getItem('aiProvider');
        const savedModel = localStorage.getItem('aiModel');
        const savedApiKey = localStorage.getItem('apiKey');

        if (savedProvider) setProvider(savedProvider);
        if (savedModel) setModel(savedModel);
        if (savedApiKey) setApiKey(savedApiKey);
    }, []);

    // Guardar configuración
    const saveSettings = () => {
        localStorage.setItem('aiProvider', provider);
        localStorage.setItem('aiModel', model);
        localStorage.setItem('apiKey', apiKey);
        setShowSettings(false);
    };

    // Enviar mensaje a la API
    const sendMessage = async () => {
        if (!message.trim() || !apiKey) return;

        //  mensaje del usuario a la conversación
        const newMessage = { role: 'user', content: message };
        setConversation([...conversation, newMessage]);
        setLoading(true);
        setMessage('');

        try {
            // historial de conversación
            const history = [...conversation, newMessage].map(msg => ({
                role: msg.role,
                content: msg.content
            }));

            let response;

            switch (provider) {
                case 'openai':
                    response = await callOpenAI(history, model, apiKey);
                    break;
                default:
                    throw new Error('Proveedor de IA no soportado');
            }

            // Agregar respuesta a la conversación
            setConversation([...conversation, newMessage, response]);
        } catch (err) {
            console.error('Error al llamar a la API:', err);
            setError(`Error: ${err.message || 'Error desconocido al llamar a la API'}`);
            setTimeout(() => setError(null), 5000);
        } finally {
            setLoading(false);
        }
    };


    // Llamada a OpenAI API
    const callOpenAI = async (messages, modelName, key) => {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`
            },
            body: JSON.stringify({
                model: modelName,
                messages: messages,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Error en la llamada a OpenAI');
        }

        const data = await response.json();
        return { role: 'assistant', content: data.choices[0].message.content };
    };

    return (
        <div className="card shadow">
            <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Chat con {AI_PROVIDERS.find(p => p.id === provider)?.name || 'IA'}</h5>
                <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => setShowSettings(true)}
                >
                    <i className="bi bi-gear"></i> Configuración
                </Button>
            </div>

            <div className="card-body">
                {/* Área de chat */}
                <div
                    className="bg-light p-3 rounded mb-3"
                    style={{ height: '400px', overflowY: 'auto' }}
                >
                    {conversation.length === 0 ? (
                        <div className="h-100 d-flex justify-content-center align-items-center">
                            <p className="text-muted">Inicia una conversación con chatgpt</p>
                        </div>
                    ) : (
                        conversation.map((msg, index) => (
                            <div
                                key={index}
                                className={`d-flex ${msg.role === 'user' ? 'justify-content-end' : 'justify-content-start'} mb-3`}
                            >
                                <div
                                    className={`p-3 rounded ${
                                        msg.role === 'user'
                                            ? 'bg-primary text-white'
                                            : 'bg-white border'
                                    }`}
                                    style={{ maxWidth: '75%', whiteSpace: 'pre-wrap' }}
                                >
                                    {msg.content}
                                </div>
                            </div>
                        ))
                    )}
                    {loading && (
                        <div className="text-center mt-3">
                            <Spinner animation="border" variant="primary" size="sm" />
                        </div>
                    )}
                </div>

                {/* Entrada de mensaje */}
                <div className="input-group">
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Escribe un mensaje..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        disabled={loading || !apiKey}
                    />
                    <Button
                        variant="primary"
                        onClick={sendMessage}
                        disabled={loading || !message.trim() || !apiKey}
                    >
                        <i className="bi bi-send"></i> Enviar
                    </Button>
                </div>

                {!apiKey && (
                    <div className="mt-2 text-danger">
                        <small>Configura tu API key en ajustes para comenzar</small>
                    </div>
                )}

                {/* Mostrar error */}
                {error && (
                    <Alert variant="danger" className="mt-3">
                        {error}
                    </Alert>
                )}
            </div>

            {/* Modal de configuración */}
            <Modal show={showSettings} onHide={() => setShowSettings(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Configuración</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Proveedor de IA</Form.Label>
                            <Form.Select
                                value={provider}
                                onChange={(e) => {
                                    setProvider(e.target.value);
                                    // Establecer el primer modelo del proveedor seleccionado
                                    const firstModel = AI_PROVIDERS.find(p => p.id === e.target.value)?.models[0];
                                    if (firstModel) setModel(firstModel);
                                }}
                            >
                                {AI_PROVIDERS.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Modelo</Form.Label>
                            <Form.Select
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                            >
                                {AI_PROVIDERS.find(p => p.id === provider)?.models.map((m) => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>API Key</Form.Label>
                            <Form.Control
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="Ingresa tu API key"
                            />
                            <Form.Text className="text-muted">
                                Ingresa tu API key para {AI_PROVIDERS.find(p => p.id === provider)?.name}
                            </Form.Text>
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowSettings(false)}>
                        Cancelar
                    </Button>
                    <Button variant="primary" onClick={saveSettings}>
                        Guardar
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}

export default AIChat;