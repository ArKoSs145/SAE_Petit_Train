import pytest
import serial
import requests
from unittest.mock import MagicMock, patch
from sender import send_scan, discover_and_start_listeners, serial_reader_thread, main

# --- Tests pour send_scan ---

@patch("requests.post")
def test_send_scan_success(mock_post):
    mock_post.return_value.ok = True
    send_scan("123456", 1)
    mock_post.assert_called_once()

@patch("requests.post")
def test_send_scan_http_error(mock_post):
    mock_post.return_value.ok = False
    mock_post.return_value.status_code = 404
    mock_post.return_value.text = "Not Found"
    send_scan("123456", 1)
    mock_post.assert_called_once()

@patch("requests.post")
def test_send_scan_connection_error(mock_post):
    mock_post.side_effect = requests.exceptions.ConnectionError()
    send_scan("123456", 1)
    mock_post.assert_called_once()

@patch("requests.post")
def test_send_scan_generic_exception(mock_post):
    mock_post.side_effect = Exception("Erreur critique")
    send_scan("123456", 1)
    mock_post.assert_called_once()

# --- Tests pour discover_and_start_listeners ---

@patch("serial.tools.list_ports.comports")
def test_discover_no_ports(mock_comports):
    mock_comports.return_value = []
    threads = discover_and_start_listeners()
    assert threads == []

@patch("serial.tools.list_ports.comports")
@patch("threading.Thread")
def test_discover_with_ports(mock_thread, mock_comports):
    mock_port = MagicMock()
    mock_port.device = "COM1"
    mock_comports.return_value = [mock_port]
    threads = discover_and_start_listeners()
    assert len(threads) == 1
    mock_thread.assert_called_once()

# --- Tests pour main ---

@patch("sender.discover_and_start_listeners")
def test_main_no_threads(mock_discover):
    mock_discover.return_value = []
    main()

@patch("sender.discover_and_start_listeners")
@patch("time.sleep")
def test_main_with_interrupt(mock_sleep, mock_discover):
    mock_discover.return_value = [MagicMock()]
    mock_sleep.side_effect = KeyboardInterrupt()
    main()

# --- Test corrigé pour serial_reader_thread ---

@patch("serial.Serial")
@patch("sender.send_scan")
def test_serial_reader_thread_logic(mock_send, mock_serial_class):
    """Teste la lecture réussie d'un code-barres."""
    mock_ser = MagicMock()
    mock_serial_class.return_value = mock_ser
    
    # 1. read(1) -> 'A'
    # 2. read(128) -> 'BC\n'
    # 3. read(128) -> b'' (sort de la boucle more)
    # 4. Nouveau cycle: read(1) lève l'exception pour finir le test
    mock_ser.read.side_effect = [b'A', b'BC\n', b'', serial.SerialException("Fin")]
    
    mock_port_info = MagicMock()
    mock_port_info.device = "COM1"
    
    with patch("time.sleep", side_effect=InterruptedError()):
        try:
            serial_reader_thread(mock_port_info, 1)
        except InterruptedError:
            pass

    mock_send.assert_called_with("ABC", 1)

@patch("serial.Serial")
def test_serial_reader_thread_generic_exception(mock_serial_class):
    """Couvre le bloc 'except Exception' pour le coverage."""
    mock_ser = MagicMock()
    mock_serial_class.return_value = mock_ser
    # Force une erreur inattendue lors de l'ouverture
    mock_ser.open.side_effect = Exception("Erreur imprévue")
    
    mock_port_info = MagicMock()
    mock_port_info.device = "COM1"
    
    with patch("time.sleep", side_effect=InterruptedError()):
        try:
            serial_reader_thread(mock_port_info, 1)
        except InterruptedError:
            pass
    # Si on arrive ici, l'exception a été catchée par le bloc générique

@patch("serial.Serial")
def test_serial_reader_thread_read_exception(mock_serial_class):
    """Couvre l'exception série directement sur le read(1)."""
    mock_ser = MagicMock()
    mock_serial_class.return_value = mock_ser
    mock_ser.read.side_effect = serial.SerialException("Erreur lecture")
    
    mock_port_info = MagicMock()
    mock_port_info.device = "COM1"
    
    with patch("time.sleep", side_effect=InterruptedError()):
        try:
            serial_reader_thread(mock_port_info, 1)
        except InterruptedError:
            pass