/**
 * Page principale 
 * Gère le plan interactif, l'automate de déplacement du train et le suivi des tâches en temps réel.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import DeleteIcon from '@mui/icons-material/Delete'
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';

import '../../styles/Base.css'
import PopupLivraison from './popup/PopupLivraison'
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';


// --- CONSTANTES DE CONFIGURATION ---

// Ordre logique du cycle (boucle horaire) : 7 -> 4 -> 5 -> 6 -> 3 -> 2 -> 1
const CYCLE_PATH = ['4' ,'5', '6', '7', '1', '2', '3'];

// Position du train : Sur la flèche JUSTE AVANT le poste de destination
const TRAIN_POSITIONS = {
  'null': { gridRow: 5, gridColumn: 5 }, 
  
  // Destination : Position de la flèche d'entrée
  '5':    { gridRow: 2, gridColumn: 5 }, 
  '6':    { gridRow: 1, gridColumn: 4 },
  '7':    { gridRow: 1, gridColumn: 2 }, 
  '4':    { gridRow: 4, gridColumn: 5 },
  '3':    { gridRow: 5, gridColumn: 2 }, 
  '2':    { gridRow: 4, gridColumn: 1 }, 
  '1':    { gridRow: 2, gridColumn: 1 },
};

// --- LOGIQUE MÉTIER ---

// Cherche dans CYCLE_PATH le prochain stand qui possède une tâche en attente.
const findNextDestination = (tasks, currentTrainLocation) => {
  const activeTasks = tasks.filter(t => t.status !== 'Commande finie' && t.status !== 'Produit manquant');

  if (currentTrainLocation) {
    const hasWorkHere = activeTasks.some(t => {
      if (t.status === 'A récupérer' && t.magasinId === currentTrainLocation) return true;
      if (t.status === 'A déposer' && t.posteId === currentTrainLocation) return true;
      return false;
    });
    if (hasWorkHere) return currentTrainLocation;
  }

  const currentIndex = currentTrainLocation ? CYCLE_PATH.indexOf(currentTrainLocation) : -1;

  for (let i = 1; i <= CYCLE_PATH.length; i++) {
    const checkIndex = (currentIndex + i) % CYCLE_PATH.length;
    const locationToCheck = CYCLE_PATH[checkIndex];

    const needsStop = activeTasks.some(t => {
      if (t.status === 'A récupérer' && t.magasinId === locationToCheck) return true;
      if (t.status === 'A déposer' && t.posteId === locationToCheck) return true;
      return false;
    });

    if (needsStop) return locationToCheck;
  }

  return null;
}

// --- COMPOSANT PRINCIPAL ---

export default function Base({mode, onApp}) {
  // --- ÉTATS ---
  const [tasks, setTasks] = useState([])
  const [posteNames, setPosteNames] = useState({}) // Remplace la constante POSTE_NAMES
  const posteNamesRef = useRef({}) // Référence pour accès instantané dans le WebSocket

  const [connected, setConnected] = useState(false)
  const wsRef = useRef(null)
  
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const [selectedPosteId, setSelectedPosteId] = useState(null)
  const [currentTrainPoste, setCurrentTrainPoste] = useState(null);
  const [cycleActive, setCycleActive] = useState(false);

  // --- LOGIQUE MÉTIER DÉPENDANTE DE L'ÉTAT ---
  
  // Cette fonction est déplacée ici pour accéder à l'état `posteNames`
  const groupTasks = (currentTasks) => {
    const activeTasks = currentTasks.filter(t => t.status !== 'Commande finie');
    const groups = CYCLE_PATH.reduce((acc, id) => {
        if (posteNames[id]) {
          acc[posteNames[id]] = [];
        }
        return acc;
      }, {});
  
    activeTasks.forEach(task => {
      const magName = posteNames[task.magasinId];
      const posteName = posteNames[task.posteId];

      if (task.status === 'A récupérer' && magName && groups[magName]) {
        groups[magName].push(task);
      }
      else if (task.status === 'A déposer' && posteName && groups[posteName]) {
        groups[posteName].push(task);
      }
    });
    return groups;
  }

  // --- CHARGEMENT DES DONNÉES & WEBSOCKET ---
  useEffect(() => {

    // 1. Charger les noms des postes depuis l'API
    const fetchStands = async () => {
        try {
            const res = await fetch(`${apiUrl}/api/stands`);
            if (res.ok) {
                const names = await res.json();
                setPosteNames(names);
                posteNamesRef.current = names; // Mise à jour de la ref pour le WebSocket
            }
        } catch (err) {
            console.error("Erreur chargement des stands:", err);
        }
    };
    fetchStands();

    // 2. Charger la liste des commandes en cours
    const fetchInitialTasks = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/commandes/en_cours?mode=${mode}`);
        if (res.ok) {
          const data = await res.json();

          const initialTasks = data.map(cmd => ({
            id: String(cmd.id), 
            posteId: String(cmd.poste),
            magasinId: String(cmd.magasin_id),
            
            // On récupère le code_barre que l'API nous donne maintenant via la jointure avec la table boite
            code_barre: cmd.code_barre ? String(cmd.code_barre).trim() : "", 
            
            item: cmd.nom_piece || cmd.code_barre || `Boîte ${cmd.id_boite}`,
            status: cmd.statut || "A récupérer", 
            gridRow: cmd.ligne,
            gridCol: cmd.colonne,
            ts: new Date(cmd.timestamp).toLocaleString(),
            stock: cmd.stock,
          }));
          setTasks(initialTasks);
        }
      } catch (err) {
        console.error("Erreur chargement initial:", err);
      }
    };
    fetchInitialTasks();

    // 3. Charger le statut du cycle
    const fetchCycleStatus = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/cycles?mode=${mode}`);
        if (res.ok) {
          const cycles = await res.json();
          if (cycles.length > 0) {
            const lastCycle = cycles[0];
            setCycleActive(lastCycle.date_fin === null);
          } else {
            setCycleActive(false);
          }
        }
      } catch (err) {
        console.error("Erreur vérification cycle:", err);
      }
    };
    fetchCycleStatus();

    // 4. Charger la position du train
    const fetchTrainPos = async () => {
        try {
            const res = await fetch(`${apiUrl}/api/train/position?mode=${mode}`);
            if (res.ok) {
                const data = await res.json();
                if (data.position) {
                    setCurrentTrainPoste(data.position);
                }
            }
        } catch (err) { console.error("Erreur récupération train:", err); }
    }
    fetchTrainPos();

    const url = (location.protocol === 'https:' ? 'wss' : 'ws') + '://' + location.hostname + ':8000/ws/scans'
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.addEventListener('open', () => setConnected(true))
    ws.addEventListener('close', () => setConnected(false))

    ws.addEventListener('message', (ev) => {
      try {
        const data = JSON.parse(ev.data)
        const device = String(data.poste)
        
        setTasks((prev) => {
            if (prev.some(t => t.id === data.id_commande)) {
                return prev;
            }

            if (posteNamesRef.current[device]) {
              const newTask = {
                id: data.id_commande, 
                posteId: device,
                magasinId: data.magasin_id ? String(data.magasin_id) : '7',
                code_barre: data.code_barre,
                item: data.nom_piece || data.code_barre,
                nom_piece: data.nom_piece || data.code_barre,
                gridRow: parseInt(data.ligne) || 1, 
                gridCol: parseInt(data.colonne) || 1,
                origin: 'Scan',
                status: 'A récupérer',
                ts: new Date().toLocaleString(),
                stock: data.stock,
              }
              return [newTask, ...prev].slice(0, 100);
            }
            return prev;
        })
      } catch (err) {
        console.error("Erreur WebSocket :", err)
      }
    })

    return () => ws.close()
  }, [mode])

  // --- CALCULS & MÉMOS --- De la prochaine destination du train ou du train

  const nextDestination = useMemo(
    () => findNextDestination(tasks, currentTrainPoste), 
    [tasks, currentTrainPoste]
  );
  
  const trainGridPosition = useMemo(
    () => TRAIN_POSITIONS[currentTrainPoste] || TRAIN_POSITIONS['null'], 
    [currentTrainPoste]
  );
  
  // Recalculer les groupes quand les tâches OU les noms de postes changent
  const taskGroups = useMemo(() => groupTasks(tasks), [tasks, posteNames]);

  // --- ACTIONS ---

  // Arrête le cycle --> obsolète
  const handleStopCycle = async () => {
    try {
        await fetch(`${apiUrl}/api/cycle/stop`, { 
            method: 'POST' 
        });
        console.log("Cycle arrêté");
    } catch (err) {
        console.error("Erreur arrêt cycle:", err);
    }
    onApp();
  }

  // Renvoie à la page d'accueil
  const handleQuitInterface = () => {
    onApp();
  }

// Regarde le status actuel du cycle et l'arrête/ le commence
const handleToggleCycle = async () => {
    try {
        if (cycleActive) {
            // Utilisation de apiUrl pour l'arrêt
            await fetch(`${apiUrl}/api/cycle/stop`, { method: 'POST' });
            console.log("Cycle arrêté");
            setCycleActive(false);
        } else {
            // CORRECTION : Définir l'URL AVANT de l'utiliser
            const url = `${apiUrl}/api/cycle/start?mode=${mode}`;
            console.log("Tentative de démarrage cycle sur :", url);
            
            const response = await fetch(url, { method: 'POST' });
            const data = await response.json();

            if (data.status === "ok") {
                console.log("Cycle démarré en mode :", mode);
                setCycleActive(true);
            } else {
                alert(data.message);
            }
        }
    } catch (err) {
        console.error("Erreur cycle:", err);
        alert("Erreur de communication avec le serveur");
    }
  }

  // Supprimer une tâche des listes à droite
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cette commande définitivement ?")) {
        return;
    }

    try {
        const res = await fetch(`${apiUrl}/api/commande/${taskId}`, {
            method: 'DELETE'
        });

        if (res.ok) {
            setTasks(prev => prev.filter(t => t.id !== taskId));
            console.log(`Tâche ${taskId} supprimée.`);
        } else {
            alert("Erreur lors de la suppression sur le serveur.");
        }
    } catch (err) {
        console.error("Erreur suppression:", err);
    }
  }

  // Chnage la position du train et ouvre la popup
  const handlePosteClick = async (posteId) => {
    if (posteId !== nextDestination) { console.warn(`Action bloquée.`); return; }
    
    setCurrentTrainPoste(posteId);
    setSelectedPosteId(posteId);
    setIsPopupOpen(true);

    try {
        await fetch(`${apiUrl}/api/train/position?mode=${mode}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ position: posteId })
        });
    } catch (err) {
        console.error("Impossible de sauvegarder la position du train:", err);
    }
  }
  
  // Ferme la popup
  const closePopup = () => setIsPopupOpen(false)
  
  // Change le statut d'une commande pour le front et envoie une requête de changement de statut pour la base de données
  const handleTaskAction = async (taskId) => {
    const currentTask = tasks.find(t => t.id === taskId);
    if (!currentTask) return;

    let nextStatusFront = "";

    // Front
    if (currentTask.status === 'A récupérer') {
      nextStatusFront = "A déposer";
    } else if (currentTask.status === 'A déposer') {
      nextStatusFront = "Commande finie";
    } else {
      return;
    }

    // Requête à la base de données
    try {
      await fetch(`${apiUrl}/api/commande/${taskId}/statut`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nouveau_statut: "ignored" })
      });

      setTasks(currentTasks => currentTasks.map(task => 
        task.id === taskId ? { ...task, status: nextStatusFront } : task
      ));

    } catch (err) {
      console.error("Erreur lors de la mise à jour du statut:", err);
    }
  }

  // Fonction pour les boutons de simultation de commandes --> obsolète
  const simulerTache = (posteId, magasinId, item, row = 1, col = 1) => {
    const newTask = {
      id: Date.now(),
      posteId: posteId,
      magasinId: magasinId,
      item: item,
      gridRow: row,
      gridCol: col,
      origin: 'Sim',
      status: 'A récupérer',
      ts: new Date().toLocaleString()
    };
    setTasks(prev => [newTask, ...prev]);
  }
  
  const handleMissingTask = (taskId) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  }

  const handleManualLocation = async (posteId) => {
    try {
      const res = await fetch(`${apiUrl}/api/train/position?mode=${mode}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position: posteId })
      });
      
      if (res.ok) {
        setCurrentTrainPoste(posteId);
        console.log(`Train déplacé manuellement au poste ${posteId}`);
      }
    } catch (err) {
      console.error("Erreur lors du déplacement manuel du train:", err);
    }
  };

  /**
   * Filtre les tâches à afficher dans la popup selon l'arrêt actuel du train.
   * Détermine si le train doit effectuer une récupération (si l'arrêt est un magasin)
   * ou un dépôt (si l'arrêt est le poste de destination)
   */
  const tasksForPopup = tasks.filter(t => {
    if (t.status === 'Commande finie') return false;
    
    const statusLower = t.status ? t.status.toLowerCase() : "";
    // On utilise includes pour être flexible sur les accents (À vs A)
    const isToPickUp = statusLower.includes('récupérer') || statusLower.includes('recuperer');
    const isToDrop = statusLower.includes('déposer') || statusLower.includes('deposer');

    if (selectedPosteId === t.magasinId && isToPickUp) return true;
    if (selectedPosteId === t.posteId && isToDrop) return true;
    
    return false;
  });
  
  useEffect(() => {
      const syncMode = async () => {
          try {
              await fetch(`${apiUrl}/api/set-active-mode`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ mode: mode })
              });
              console.log("Serveur synchronisé sur le mode :", mode);
          } catch (err) {
              console.error("Erreur de synchro mode:", err);
          }
      };
      syncMode();
  }, [mode, apiUrl]);

  /**
   * Génère le style dynamique pour les cases des stands sur le plan.
   * Met en relief visuellement la destination actuelle du train
  */
const getBoxSx = (posteId) => {
  const isActive = nextDestination === posteId; 
  
  return {
    width: '100%',
    height: '100%', 
    display: 'flex',
    flexDirection: 'column', 

    p: 1,
    borderRadius: '8px',
    backgroundColor: isActive ? '#0052CC' : '#FFFFFF',
    color: isActive ? '#FFFFFF' : '#172B4D',
    border: '2px solid',
    borderColor: isActive ? '#0052CC' : '#DFE1E6',
    boxShadow: isActive ? '0 4px 12px rgba(0, 82, 204, 0.3)' : '0 1px 3px rgba(0,0,0,0.1)',
    transition: 'all 0.2s ease',
    overflow: 'hidden',
    cursor: 'pointer',

    '&:hover': {
      borderColor: '#0052CC',
      transform: 'translateY(-2px)'
    }
  };
}

  // Style des flèches du plan
  const arrowSx = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    fontSize: '2.5rem',
    color: '#000000ff',
    userSelect: 'none',
    fontWeight: 'bold'
  };

  /**
   * Affiche une flèche sur le plan à une position précise.
   * La flèche devient invisible si le train se trouve exactement sur sa case
   */
  const GridArrow = ({ row, col, symbol }) => {
    const isTrainHere = trainGridPosition.gridRow === row && trainGridPosition.gridColumn === col;
    return (
      <Typography sx={{
          ...arrowSx,
          gridRow: row,
          gridColumn: col,
          opacity: isTrainHere ? 0 : 1, 
          transition: 'opacity 0.2s ease',
        }}>
        {symbol}
      </Typography>
    );
  };

return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh',
      width: '100vw', 
      bgcolor: '#F4F5F7', // Fond gris clair standard Kanban
      p: 2, 
      boxSizing: 'border-box',
      overflow: 'hidden',
      fontFamily: "'Inter', sans-serif"
    }}>
      
      {/* Layout Principal : Plan à gauche, Colonnes Kanban à droite */}
      <Box sx={{ display: 'flex', height: '100%', width: '100%', gap: 3 }}>
        
        {/* --- ZONE PLAN (Aspect Blueprint Professionnel) --- */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Paper elevation={0} sx={{ 
            flexGrow: 1, 
            p: 3, 
            display: 'flex', 
            flexDirection: 'column', 
            borderRadius: '12px',
            border: '1px solid #DFE1E6',
            bgcolor: 'white'
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#172B4D' }}>Plan de Circulation</Typography>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Button 
                  variant="contained" 
                  color={cycleActive ? "warning" : "success"}
                  onClick={handleToggleCycle}
                  startIcon={cycleActive ? <StopIcon /> : <PlayArrowIcon />}
                  sx={{ borderRadius: '6px', fontWeight: 600, textTransform: 'none' }}
                >
                  {cycleActive ? "Arrêter le cycle" : "Démarrer un cycle"}
                </Button>
                <Button 
                  variant="outlined" 
                  onClick={handleQuitInterface}
                  sx={{ borderRadius: '6px', color: '#42526E', borderColor: '#DFE1E6', textTransform: 'none', fontWeight: 600 }}
                >
                  Quitter
                </Button>
              </Box>
            </Box>
            
            {/* GRILLE DU PLAN ÉPURÉE */}
            <Box sx={{
                flexGrow: 1,
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)', 
                gridTemplateRows: 'repeat(5, 1fr)',
                gap: '15px', 
                p: 2,
                borderRadius: '8px',
                bgcolor: '#FAFBFC',
                border: '1px dashed #DFE1E6'
              }}
            >
              {/* --- LIGNE 1 : HAUT --- */}
              <Paper id="presse_emboutir" sx={{ ...getBoxSx('7'), gridArea: '1 / 1' }} onClick={() => handlePosteClick('7')}>
                <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                  <Typography sx={{ fontWeight: 'bold', fontSize: 'clamp(0.7rem, 1vw, 0.9rem)', lineHeight: 1.2 }}>
                    {posteNames['7'] || '...'}
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  color="info"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleManualLocation('7');
                  }}
                  sx={{
                    width: '100%',
                    height: '40px',
                    minHeight: '40px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    mt: 0.5
                  }}
                  startIcon={<PlayArrowIcon fontSize="small" />}
                >
                  Aller ici
                </Button>
              </Paper>
              <GridArrow row={1} col={2} symbol="←" />
              <Paper id="tour_cn" sx={{ ...getBoxSx('6'), gridArea: '1 / 3' }} onClick={() => handlePosteClick('6')}>
                <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                  <Typography sx={{ fontWeight: 'bold', fontSize: 'clamp(0.7rem, 1vw, 0.9rem)', lineHeight: 1.2 }}>
                    {posteNames['6'] || '...'}
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  color="info"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleManualLocation('6');
                  }}
                  sx={{
                    width: '100%',
                    height: '40px',
                    minHeight: '40px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    mt: 0.5
                  }}
                  startIcon={<PlayArrowIcon fontSize="small" />}
                >
                  Aller ici
                </Button>
              </Paper>
              <GridArrow row={1} col={4} symbol="←" />
              <Paper id="magasin_externe" sx={{ ...getBoxSx('5'), gridArea: '1 / 5' }} onClick={() => handlePosteClick('5')}>
                <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                  <Typography sx={{ fontWeight: 'bold', fontSize: 'clamp(0.7rem, 1vw, 0.9rem)', lineHeight: 1.2 }}>
                    {posteNames['5'] || '...'}
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  color="info"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleManualLocation('5');
                  }}
                  sx={{
                    width: '100%',
                    height: '40px',
                    minHeight: '40px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    mt: 0.5
                  }}
                  startIcon={<PlayArrowIcon fontSize="small" />}
                >
                  Aller ici
                </Button>
              </Paper>
              
              <GridArrow row={2} col={5} symbol="↑" />
              <Paper id="presse_injection" sx={{ ...getBoxSx('4'), gridArea: '3 / 5' }} onClick={() => handlePosteClick('4')}>
                <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                  <Typography sx={{ fontWeight: 'bold', fontSize: 'clamp(0.7rem, 1vw, 0.9rem)', lineHeight: 1.2 }}>
                    {posteNames['4'] || '...'}
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  color="info"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleManualLocation('4');
                  }}
                  sx={{
                    width: '100%',
                    height: '40px',
                    minHeight: '40px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    mt: 0.5
                  }}
                  startIcon={<PlayArrowIcon fontSize="small" />}
                >
                  Aller ici
                </Button>
              </Paper>
              <GridArrow row={4} col={5} symbol="↑" />

              <GridArrow row={2} col={1} symbol="↓" />
              <Paper id="poste-1" sx={{ ...getBoxSx('1'), gridArea: '3 / 1' }} onClick={() => handlePosteClick('1')}>
                <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                  <Typography sx={{ fontWeight: 'bold', fontSize: 'clamp(0.7rem, 1vw, 0.9rem)', lineHeight: 1.2 }}>
                    {posteNames['1'] || '...'}
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  color="info"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleManualLocation('1');
                  }}
                  sx={{
                    width: '100%',
                    height: '40px',
                    minHeight: '40px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    mt: 0.5
                  }}
                  startIcon={<PlayArrowIcon fontSize="small" />}
                >
                  Aller ici
                </Button>
              </Paper>
              <GridArrow row={4} col={1} symbol="↓" />

              {/* --- LIGNE 5 : BAS --- */}
              <Paper id="poste-2" sx={{ ...getBoxSx('2'), gridArea: '5 / 1' }} onClick={() => handlePosteClick('2')}>
                <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                  <Typography sx={{ fontWeight: 'bold', fontSize: 'clamp(0.7rem, 1vw, 0.9rem)', lineHeight: 1.2 }}>
                    {posteNames['2'] || '...'}
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  color="info"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleManualLocation('2');
                  }}
                  sx={{
                    width: '100%',
                    height: '40px',
                    minHeight: '40px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    mt: 0.5
                  }}
                  startIcon={<PlayArrowIcon fontSize="small" />}
                >
                  Aller ici
                </Button>
              </Paper>
              <GridArrow row={5} col={2} symbol="→" />
              <Paper id="poste-3" sx={{ ...getBoxSx('3'), gridArea: '5 / 3' }} onClick={() => handlePosteClick('3')}>
                <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                  <Typography sx={{ fontWeight: 'bold', fontSize: 'clamp(0.7rem, 1vw, 0.9rem)', lineHeight: 1.2 }}>
                    {posteNames['3'] || '...'}
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  color="info"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleManualLocation('3');
                  }}
                  sx={{
                    width: '100%',
                    height: '40px',
                    minHeight: '40px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    mt: 0.5
                  }}
                  startIcon={<PlayArrowIcon fontSize="small" />}
                >
                  Aller ici
                </Button>
              </Paper>
              <GridArrow row={5} col={4} symbol="→" />

              {/* LE TRAIN (Icone plus propre) */}
              <Box sx={{
                  gridRow: trainGridPosition.gridRow,
                  gridColumn: trainGridPosition.gridColumn,
                  transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  zIndex: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <img src="../../../images/cart2.png" alt="train" style={{ width: '60px', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))' }}/>
              </Box>
            </Box>
          </Paper>
        </Box>
        
        {/* --- COLONNE KANBAN : À RÉCUPÉRER --- */}
        <Box sx={{ width: '340px', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <Paper elevation={0} sx={{ 
            flexGrow: 1, p: 1.5, borderRadius: '8px', bgcolor: '#EBECF0', display: 'flex', flexDirection: 'column' 
          }}>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#5E6C84', px: 1, mb: 2, textTransform: 'uppercase' }}>
              À RÉCUPÉRER ({tasks.filter(t => t.status.includes('récupérer')).length})
            </Typography>
            
            <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
              {CYCLE_PATH.map(posteId => {
                const tasksToPickUp = tasks.filter(t => t.magasinId === posteId && t.status.includes('récupérer'));
                if (tasksToPickUp.length === 0) return null;

                return (
                  <Box key={posteId} sx={{ mb: 2 }}>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#42526E', mb: 0.5, px: 1 }}>
                      {posteNames[posteId]}
                    </Typography>
                    {tasksToPickUp.map(task => (
                      <Paper key={task.id} elevation={0} sx={{ 
                        p: 1.5, mb: 1, bgcolor: 'white', borderRadius: '4px', borderBottom: '1px solid #DFE1E6',
                        boxShadow: '0 1px 2px rgba(9, 30, 66, 0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}>
                        <Box>
                          <Typography sx={{ fontSize: '0.9rem', fontWeight: 500, color: '#172B4D' }}>{task.item}</Typography>
                          <Typography sx={{ fontSize: '0.75rem', color: '#5E6C84' }}>→ {posteNames[task.posteId]}</Typography>
                        </Box>
                        <IconButton onClick={() => handleDeleteTask(task.id)} size="small" sx={{ color: '#EB5757' }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Paper>
                    ))}
                  </Box>
                );
              })}
            </Box>
          </Paper>
        </Box>

        {/* --- COLONNE KANBAN : À DÉPOSER --- */}
        <Box sx={{ width: '340px', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <Paper elevation={0} sx={{ 
            flexGrow: 1, p: 1.5, borderRadius: '8px', bgcolor: '#EBECF0', display: 'flex', flexDirection: 'column' 
          }}>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#5E6C84', px: 1, mb: 2, textTransform: 'uppercase' }}>
              À DÉPOSER ({tasks.filter(t => t.status.includes('déposer')).length})
            </Typography>
            
            <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
              {CYCLE_PATH.map(posteId => {
                const tasksToDrop = tasks.filter(t => t.posteId === posteId && t.status.includes('déposer'));
                if (tasksToDrop.length === 0) return null;

                return (
                  <Box key={posteId} sx={{ mb: 2 }}>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#42526E', mb: 0.5, px: 1 }}>
                      {posteNames[posteId]}
                    </Typography>
                    {tasksToDrop.map(task => (
                      <Paper key={task.id} elevation={0} sx={{ 
                        p: 1.5, mb: 1, bgcolor: 'white', borderRadius: '4px', borderBottom: '1px solid #DFE1E6',
                        boxShadow: '0 1px 2px rgba(9, 30, 66, 0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}>
                        <Box>
                          <Typography sx={{ fontSize: '0.9rem', fontWeight: 500, color: '#172B4D' }}>{task.item}</Typography>
                          <Typography sx={{ fontSize: '0.75rem', color: '#5E6C84' }}>depuis {posteNames[task.magasinId]}</Typography>
                        </Box>
                        <IconButton onClick={() => handleDeleteTask(task.id)} size="small" sx={{ color: '#EB5757' }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Paper>
                    ))}
                  </Box>
                );
              })}
            </Box>
          </Paper>
        </Box>
      </Box>
      
      {/* Composant de Popup conservé tel quel */}
      <PopupLivraison
        open={isPopupOpen}
        onClose={closePopup}
        posteId={selectedPosteId}
        posteName={posteNames[selectedPosteId] || ''} 
        tasks={tasksForPopup} 
        onDeliver={handleTaskAction}
        onMissing={handleMissingTask}
      />
    </Box>
  );
}