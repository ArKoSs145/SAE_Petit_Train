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
import PopupLivraison from '../templates/popup/PopupLivraison'

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

export default function Base({onApp}) {
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
            const res = await fetch('http://localhost:8000/api/stands');
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

    const fetchInitialTasks = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/commandes/en_cours');
        if (res.ok) {
          const data = await res.json();

          const initialTasks = data.map(cmd => ({
            id: String(cmd.id), 
            posteId: String(cmd.poste),
            magasinId: String(cmd.magasin_id),
            
            // C'EST ICI : On récupère le code_barre que l'API nous donne maintenant
            // via la jointure avec la table boite
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
        const res = await fetch('http://localhost:8000/api/cycles');
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

    const fetchTrainPos = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/train/position');
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
                code_barre: data.code_barre, // <-- La clé indispensable pour PopupLivraison
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
  }, [])

  // --- CALCULS & MÉMOS ---

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

  const handleStopCycle = async () => {
    try {
        await fetch('http://localhost:8000/api/cycle/stop', { 
            method: 'POST' 
        });
        console.log("Cycle arrêté");
    } catch (err) {
        console.error("Erreur arrêt cycle:", err);
    }
    onApp();
  }

  const handleQuitInterface = () => {
    onApp();
  }

  const handleToggleCycle = async () => {
    try {
        if (cycleActive) {
            await fetch('http://localhost:8000/api/cycle/stop', { method: 'POST' });
            console.log("Cycle arrêté");
            setCycleActive(false);
        } else {
            await fetch('http://localhost:8000/api/cycle/start', { method: 'POST' });
            console.log("Cycle démarré");
            setCycleActive(true);
        }
    } catch (err) {
        console.error("Erreur cycle:", err);
        alert("Erreur de communication avec le serveur");
    }
  }

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cette commande définitivement ?")) {
        return;
    }

    try {
        const res = await fetch(`http://localhost:8000/api/commande/${taskId}`, {
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

  // Popup logic
  const handlePosteClick = async (posteId) => {
    if (posteId !== nextDestination) { console.warn(`Action bloquée.`); return; }
    
    setCurrentTrainPoste(posteId);
    setSelectedPosteId(posteId);
    setIsPopupOpen(true);

    try {
        await fetch('http://localhost:8000/api/train/position', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ position: posteId })
        });
    } catch (err) {
        console.error("Impossible de sauvegarder la position du train:", err);
    }
  }
  
  const closePopup = () => setIsPopupOpen(false)
  
  const handleTaskAction = async (taskId) => {
    const currentTask = tasks.find(t => t.id === taskId);
    if (!currentTask) return;

    let nextStatusFront = "";

    if (currentTask.status === 'A récupérer') {
      nextStatusFront = "A déposer";
    } else if (currentTask.status === 'A déposer') {
      nextStatusFront = "Commande finie";
    } else {
      return;
    }

    try {
      await fetch(`http://localhost:8000/api/commande/${taskId}/statut`, {
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

  const tasksForPopup = tasks.filter(t => {
    if (t.status === 'Commande finie') return false;
    
    // Normalisation du statut (minuscule + retrait des accents si possible)
    const statusLower = t.status ? t.status.toLowerCase() : "";
    
    // Vérifie si c'est une action de récupération ou de dépôt
    const isToPickUp = statusLower.includes('récupérer') || statusLower.includes('recuperer');
    const isToDrop = statusLower.includes('déposer') || statusLower.includes('deposer');

    // Si on est au magasin et qu'il faut ramasser
    if (selectedPosteId === t.magasinId && isToPickUp) return true;
    // Si on est au poste de destination et qu'il faut livrer
    if (selectedPosteId === t.posteId && isToDrop) return true;
    
    return false;
  });


  const getBoxSx = (posteId) => {
    const isActive = nextDestination === posteId; 
    
    return {
      width: '100%',
      height: '100%', 
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      p: 1,
      textAlign: 'center',
      cursor: 'pointer',
      border: '5px solid',
      borderColor: isActive ? 'primary.main' : 'transparent',
      transform: isActive ? 'scale(1.02)' : 'scale(1)',
      boxShadow: isActive ? 6 : 2,
      transition: 'all 0.2s ease-in-out',
      borderRadius: 4,
      overflow: 'hidden',
      wordBreak: 'break-word',
      fontSize: 'clamp(0.9rem, 1.2vw, 1.4rem)',
      fontWeight: 'bold',
      backgroundColor: 'white',

      '&:hover': { boxShadow: 6 }
    };
  }

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
      bgcolor: 'grey.100',
      p: 1, 
      boxSizing: 'border-box',
      overflow: 'hidden'
    }}>
      
      {/* Conteneur Flex pour Plan (gauche) et Sidebar (droite) */}
      <Box sx={{ display: 'flex', height: '100%', width: '100%', gap: 2 }}>
        
        {/* --- ZONE PLAN (Gauche) --- */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Paper elevation={2} sx={{ flexGrow: 1, p: 2, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 3 }}>
            <Typography variant="h4" gutterBottom>Plan</Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              <Button variant="contained" color="error" onClick={handleQuitInterface}>
                Quitter
              </Button>

              <Button 
                variant="contained" 
                color={cycleActive ? "warning" : "success"}
                onClick={handleToggleCycle}
                startIcon={cycleActive ? <StopIcon /> : <PlayArrowIcon />}
                sx={{ fontWeight: 'bold' }}
              >
                {cycleActive ? "Arrêter le cycle" : "Démarrer un cycle"}
              </Button>
            </Box>
            
            {/* GRILLE DU PLAN */}
            <Box sx={{
                flexGrow: 1,
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)', 
                gridTemplateRows: 'repeat(5, 1fr)',
                gap: '1%', 
                alignItems: 'center',      
                justifyItems: 'center', 
                width: '98%',
                height: '100%',
                padding: 1
              }}
            >
              {/* --- LIGNE 1 : HAUT --- */}
              <Paper id="presse_emboutir" sx={{ ...getBoxSx('7'), gridArea: '1 / 1' }} onClick={() => handlePosteClick('7')}>
                {posteNames['7'] || 'Chargement...'}
              </Paper>
              <GridArrow row={1} col={2} symbol="←" />
              <Paper id="tour_cn" sx={{ ...getBoxSx('6'), gridArea: '1 / 3' }} onClick={() => handlePosteClick('6')}>
                {posteNames['6'] || 'Chargement...'}
              </Paper>
              <GridArrow row={1} col={4} symbol="←" />
              <Paper id="magasin_externe" sx={{ ...getBoxSx('5'), gridArea: '1 / 5' }} onClick={() => handlePosteClick('5')}>
                {posteNames['5'] || 'Chargement...'}
              </Paper>
              
              
              {/* --- LIGNES VERTICALES --- */}
              {/* Droite (Descend) */}
              <GridArrow row={2} col={5} symbol="↑" />
              <Paper id="presse_injection" sx={{ ...getBoxSx('4'), gridArea: '3 / 5' }} onClick={() => handlePosteClick('4')}>
                {posteNames['4'] || 'Chargement...'}
              </Paper>
              <GridArrow row={4} col={5} symbol="↑" />

              {/* Gauche (Monte) */}
              <GridArrow row={2} col={1} symbol="↓" />
              <Paper id="poste-1" sx={{ ...getBoxSx('1'), gridArea: '3 / 1' }} onClick={() => handlePosteClick('1')}>
                {posteNames['1'] || 'Chargement...'}
              </Paper>
              <GridArrow row={4} col={1} symbol="↓" />

              {/* --- LIGNE 5 : BAS --- */}
              <Paper id="poste-2" sx={{ ...getBoxSx('2'), gridArea: '5 / 1' }} onClick={() => handlePosteClick('2')}>
                {posteNames['2'] || 'Chargement...'}
              </Paper>
              <GridArrow row={5} col={2} symbol="→" />
              <Paper id="poste-3" sx={{ ...getBoxSx('3'), gridArea: '5 / 3' }} onClick={() => handlePosteClick('3')}>
                {posteNames['3'] || 'Chargement...'}
              </Paper>
              <GridArrow row={5} col={4} symbol="→" />

              {/* --- LE TRAIN --- */}
              <Typography variant="h4" className="train" sx={{
                  gridRow: trainGridPosition.gridRow,
                  gridColumn: trainGridPosition.gridColumn,
                  transition: 'all 0.5s ease-in-out',
                  textAlign: 'center',
                  m: 'auto',
                  zIndex: 10,
                  pointerEvents: 'none',
                  fontSize: '3rem',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
                }}
              >
                <img className="image" src= "../../../images/cart2.png" alt="train"/>
              </Typography>

            </Box>
          </Paper>
        </Box>
        
        {/* --- SIDEBAR (Droite) : À Récupérer --- */}
        <Box sx={{ width: '320px', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <Paper elevation={2} sx={{ flexGrow: 1, p: 2, borderRadius: 3, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h4" gutterBottom>À récupérer</Typography>
            
            <Box sx={{ flexGrow: 1, overflowY: 'auto', mb: 2, pr: 1 }}>
              {CYCLE_PATH.map(posteId => {
                const posteName = posteNames[posteId];
                if (!posteName) return null;

                const tasksForPoste = taskGroups[posteName] || [];
                
                const tasksToPickUp = tasks.filter(t => 
                    t.magasinId === posteId && 
                    (t.status === 'A récupérer' || t.status === 'À récupérer' || (t.status && t.status.includes('récupérer')))
                );
                
                if (tasksToPickUp.length === 0) return null;

                return (
                  <Paper key={posteId} elevation={1} sx={{ p: 2, mb: 2, borderLeft: '4px solid #1976d2' }}>
                    <Typography variant="h6">{posteName}</Typography>
                    <List dense>
                      {tasksForPoste.map(task => (
                        <ListItem key={task.id} 
                          secondaryAction={
                            <IconButton edge="end" onClick={() => handleDeleteTask(task.id)} color="error" size="small">
                              <DeleteIcon />
                            </IconButton>
                          }
                        >
                          <ListItemText 
                            primary={task.item}
                            secondary={`Apporter au ${posteNames[task.posteId] || '?'}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                );
              })}

              {tasks.filter(t => t.status !== 'Commande finie').length === 0 && (
                <Typography sx={{ p: 2, color: 'text.secondary' }}>Aucune tâche en attente.</Typography>
              )}
            </Box>
          </Paper>
        </Box>

        {/* --- SIDEBAR (Droite) : À Déposer --- */}
        <Box sx={{ width: '320px', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <Paper elevation={2} sx={{ flexGrow: 1, p: 2, borderRadius: 3, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h4" gutterBottom>À déposer</Typography>
            
            <Box sx={{ flexGrow: 1, overflowY: 'auto', mb: 2, pr: 1 }}>
              {CYCLE_PATH.map(posteId => {
                const posteName = posteNames[posteId];
                if (!posteName) return null;

                const tasksForPoste = taskGroups[posteName] || [];
                
                const tasksToDrop = tasks.filter(t => 
                    t.posteId === posteId && 
                    (t.status === 'A déposer' || t.status === 'À déposer' || (t.status && t.status.includes('déposer')))
                );
                
                if (tasksToDrop.length === 0) return null;

                return (
                  <Paper key={posteId} elevation={1} sx={{ p: 2, mb: 2, borderLeft: '4px solid #1976d2' }}>
                    <Typography variant="h6">{posteName}</Typography>
                    <List dense>
                      {tasksForPoste.map(task => (
                        <ListItem key={task.id} 
                          secondaryAction={
                            <IconButton edge="end" onClick={() => handleDeleteTask(task.id)} color="error" size="small">
                              <DeleteIcon />
                            </IconButton>
                          }
                        >
                          <ListItemText 
                            primary={task.item}
                            secondary={`Venant de ${posteNames[task.magasinId] || '?'}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                );
              })}

              {tasks.filter(t => t.status !== 'Commande finie').length === 0 && (
                <Typography sx={{ p: 2, color: 'text.secondary' }}>Aucune tâche en attente.</Typography>
              )}
            </Box>
          </Paper>
        </Box>
      </Box>
      
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
  )
}