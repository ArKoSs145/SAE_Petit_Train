import database
import requetes

# Initialisation
database.init_db()
database.data_db()

# Charger la dernière position du train
pos = requetes.get_position_train()
train = database.Train(pos)

print("Position initiale :", train.get_position())

# Déplacer le train
train.move_forward()
print("Nouvelle position :", train.get_position())
train.move_forward()
print("Nouvelle position :", train.get_position())
train.move_forward()
print("Nouvelle position :", train.get_position())

# Sauvegarder la nouvelle position
requetes.save_train_position(train.get_position())
