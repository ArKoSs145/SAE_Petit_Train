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
const CYCLE_PATH = ['4' ,'7', '6', '5', '1', '2', '3'];

const POSTE_NAMES = {
  '1': 'Arrêt Poste 1',
  '2': 'Arrêt Poste 2',
  '3': 'Arrêt Poste 3',
  '4': 'Presse à Injecter',
  '5': 'Presse à Emboutir',
  '6': 'Tour CN',
  '7': 'Magasin Externe',
};

// Position du train : Sur la flèche JUSTE AVANT le poste de destination
const TRAIN_POSITIONS = {
  'null': { gridRow: 5, gridColumn: 5 }, 
  
  // Destination : Position de la flèche d'entrée
  '7':    { gridRow: 2, gridColumn: 5 }, // Flèche ↑ (Avant Fournisseur)
  '4':    { gridRow: 4, gridColumn: 5 }, // Flèche → (Avant Presse)
  '5':    { gridRow: 1, gridColumn: 2 }, // Flèche → (Avant Machine X)
  '6':    { gridRow: 1, gridColumn: 4 }, // Flèche ↓ (Avant Machine Y)
  '3':    { gridRow: 5, gridColumn: 2 }, // Flèche ← (Avant Poste 3)
  '2':    { gridRow: 4, gridColumn: 1 }, // Flèche ← (Avant Poste 2)
  '1':    { gridRow: 2, gridColumn: 1 }, // Flèche ↑ (Avant Poste 1)
};

// --- LOGIQUE MÉTIER ---

const groupTasks = (tasks) => {
  const activeTasks = tasks.filter(t => t.status !== 'Commande finie');
  const groups = CYCLE_PATH.reduce((acc, id) => {
      if (POSTE_NAMES[id]) {
        acc[POSTE_NAMES[id]] = [];
      }
      return acc;
    }, {});

  activeTasks.forEach(task => {
    if (task.status === 'A récupérer' && POSTE_NAMES[task.magasinId]) {
      groups[POSTE_NAMES[task.magasinId]].push(task);
    }
    else if (task.status === 'A déposer' && POSTE_NAMES[task.posteId]) {
      groups[POSTE_NAMES[task.posteId]].push(task);
    }
  });
  return groups;
}

const findNextDestination = (tasks, currentTrainLocation) => {
  const activeTasks = tasks.filter(t => t.status !== 'Commande finie');

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
  const [tasks, setTasks] = useState([])
  const [connected, setConnected] = useState(false)
  const wsRef = useRef(null)
  
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const [selectedPosteId, setSelectedPosteId] = useState(null)
  const [currentTrainPoste, setCurrentTrainPoste] = useState(null);

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


  const [cycleActive, setCycleActive] = useState(false);

  // --- Connexion WebSocket ---
  useEffect(() => {

    // 1. Charger les noms des postes depuis la DB
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
          
          // On transforme les données DB en format Tâche pour le front
          const initialTasks = data.map(cmd => ({
            id: cmd.id,
            posteId: String(cmd.poste),
            magasinId: String(cmd.magasin_id),
            item: cmd.code_barre,
            
            // Mapping des statuts DB vers Front
            status: cmd.statut === 'A récupérer' ? 'A récupérer' : 
                    cmd.statut === 'A déposer' ? 'A déposer' : 'pending',
            
            gridRow: cmd.ligne,
            gridCol: cmd.colonne,
            ts: new Date(cmd.timestamp).toLocaleString()
          }));
          
          setTasks(initialTasks);
        }
      } catch (err) {
        console.error("Erreur chargement initial:", err);
      }
    };
    fetchInitialTasks();

    const fetchCycleStatus = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/cycles');
        if (res.ok) {
          const cycles = await res.json();
          
          if (cycles.length > 0) {
            const lastCycle = cycles[0];
            
            if (lastCycle.date_fin === null) {
                console.log("Cycle actif trouvé ID:", lastCycle.idCycle);
                setCycleActive(true);
            } else {
                console.log("Dernier cycle terminé.");
                setCycleActive(false);
            }
          } else {
            setCycleActive(false);
          }
        }
      } catch (err) {
        console.error("Erreur vérification cycle:", err);
      }
    };
    fetchCycleStatus();

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

            if (POSTE_NAMES[device]) {
              const newTask = {
                id: data.id_commande, 
                
                posteId: device,
                magasinId: data.magasin_id ? String(data.magasin_id) : '7',
                item: data.nom_piece || data.code_barre,
                
                gridRow: parseInt(data.ligne) || 1, 
                gridCol: parseInt(data.colonne) || 1,

                origin: 'Scan',
                status: 'A récupérer',
                ts: new Date().toLocaleString()
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

  const nextDestination = useMemo(
    () => findNextDestination(tasks, currentTrainPoste), 
    [tasks, currentTrainPoste]
  );
  
  const trainGridPosition = useMemo(
    () => TRAIN_POSITIONS[currentTrainPoste] || TRAIN_POSITIONS['null'], 
    [currentTrainPoste]
  );
  
  const taskGroups = useMemo(() => groupTasks(tasks), [tasks]);

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

  const handleDeleteTask = (taskId) => {
    setTasks(currentTasks => currentTasks.filter(t => t.id !== taskId));
  }

  // Style des cartes (Postes / Machines)
  const getBoxSx = (posteId) => {
    const isActive = nextDestination === posteId; 
    
    return {
      width: '100%',
      height: '100%', // Remplissage complet
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

  // --- Composant Flèche (Interne) ---
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
    // La flèche disparaît si le train est sur ses coordonnées
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

  // Popup logic
  const handlePosteClick = (posteId) => {
    if (posteId !== nextDestination) {
      console.warn(`Action bloquée: Prochaine destination est ${nextDestination}.`);
      return;
    }
    setCurrentTrainPoste(posteId); 
    setSelectedPosteId(posteId)
    setIsPopupOpen(true)
  }
  
  const closePopup = () => setIsPopupOpen(false)
  
  // --- GESTION DU STATUT DES COMMANDES ---
  const handleTaskAction = async (taskId) => {
    const currentTask = tasks.find(t => t.id === taskId);
    if (!currentTask) return;

    let nextStatusDB = "";
    let nextStatusFront = "";

    if (currentTask.status === 'A récupérer') {
      nextStatusDB = "A déposer";
      nextStatusFront = "A déposer";
    } else if (currentTask.status === 'A déposer') {
      nextStatusDB = "Commande finie";
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

  const tasksForPopup = tasks.filter(t => {
    if (t.status === 'Commande finie') return false;
    if (selectedPosteId === t.magasinId && t.status === 'A récupérer') return true;
    if (selectedPosteId === t.posteId && t.status === 'A déposer') return true;
    return false;
  });

  // --- Rendu JSX ---
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
              
              {/* Boutons mis à jour avec : Poste, Magasin, Nom de l'objet */}
              <Button 
                variant="outlined" color="info" size="small" 
                onClick={() => simulerTache('1', '5', 'Vis A (M5->P1)', 2, 1)}
              >
                Sim (M5 - P1)
              </Button>

              <Button size="small" variant="outlined" 
                onClick={() => simulerTache('2', '4', 'Plastique (M4 -> P2)', 2, 1)}>
                Sim (M4 - P2)
              </Button>

              <Button 
                 variant="outlined" color="info" size="small" 
                 onClick={() => simulerTache('3', '7', 'Colis (Fourn -> P3)', 1, 1)}
              >
                Sim (F - P3)
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
              <Paper id="magasin_externe" sx={{ ...getBoxSx('7'), gridArea: '1 / 5' }} onClick={() => handlePosteClick('7')}>{POSTE_NAMES['7']}</Paper>
              <GridArrow row={1} col={2} symbol="←" />
              <Paper id="tour_cn" sx={{ ...getBoxSx('6'), gridArea: '1 / 3' }} onClick={() => handlePosteClick('6')}>{POSTE_NAMES['6']}</Paper>
              <GridArrow row={1} col={4} symbol="←" />
              <Paper id="presse_emboutir" sx={{ ...getBoxSx('5'), gridArea: '1 / 1' }} onClick={() => handlePosteClick('5')}>{POSTE_NAMES['5']}</Paper>
              
              {/* --- LIGNES VERTICALES --- */}
              {/* Droite (Descend) */}
              <GridArrow row={2} col={5} symbol="↑" />
              <Paper id="presse_injection" sx={{ ...getBoxSx('4'), gridArea: '3 / 5' }} onClick={() => handlePosteClick('4')}>{POSTE_NAMES['4']}</Paper>
              <GridArrow row={4} col={5} symbol="↑" />

              {/* Gauche (Monte) */}
              <GridArrow row={2} col={1} symbol="↓" />
              <Paper id="poste-1" sx={{ ...getBoxSx('1'), gridArea: '3 / 1' }} onClick={() => handlePosteClick('1')}>{POSTE_NAMES['1']}</Paper>
              <GridArrow row={4} col={1} symbol="↓" />

              {/* --- LIGNE 5 : BAS --- */}
              <Paper id="poste-2" sx={{ ...getBoxSx('2'), gridArea: '5 / 1' }} onClick={() => handlePosteClick('2')}>{POSTE_NAMES['2']}</Paper>
              <GridArrow row={5} col={2} symbol="→" />
              <Paper id="poste-3" sx={{ ...getBoxSx('3'), gridArea: '5 / 3' }} onClick={() => handlePosteClick('3')}>{POSTE_NAMES['3']}</Paper>
              <GridArrow row={5} col={4} symbol="→" />
              {/* Coin bas-droit (5/5) vide ou pour transition */}

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
                <img class ="image" src= "../../../images/cart2.png"/>
              </Typography>

            </Box>
          </Paper>
        </Box>
        
        {/* --- SIDEBAR (Droite) --- */}
        <Box sx={{ width: '320px', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <Paper elevation={2} sx={{ flexGrow: 1, p: 2, borderRadius: 3, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h4" gutterBottom>À récupérer</Typography>
            
            <Box sx={{ flexGrow: 1, overflowY: 'auto', mb: 2, pr: 1 }}>
              {CYCLE_PATH.map(posteId => {
                const posteName = POSTE_NAMES[posteId];
                const tasksForPoste = taskGroups[posteName];
                
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
                            secondary={task.status === 'A récupérer' ? 
                              `Aller chercher au ${POSTE_NAMES[task.magasinId]}` : 
                              `Apporter au ${POSTE_NAMES[task.posteId]}`
                            }
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

        {/* --- SIDEBAR (Droite) --- */}
        <Box sx={{ width: '320px', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <Paper elevation={2} sx={{ flexGrow: 1, p: 2, borderRadius: 3, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h4" gutterBottom>À déposer</Typography>
            
            <Box sx={{ flexGrow: 1, overflowY: 'auto', mb: 2, pr: 1 }}>
              {CYCLE_PATH.map(posteId => {
                const posteName = POSTE_NAMES[posteId];
                const tasksForPoste = taskGroups[posteName];
                
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
                            secondary={task.status === 'A récupérer' ? 
                              `Aller chercher au ${POSTE_NAMES[task.magasinId]}` : 
                              `Apporter au ${POSTE_NAMES[task.posteId]}`
                            }
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
        posteName={POSTE_NAMES[selectedPosteId] || ''} 
        tasks={tasksForPopup} 
        onDeliver={handleTaskAction}
      />
    </Box>
  )
}