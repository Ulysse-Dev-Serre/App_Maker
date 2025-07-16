
import sys
from PySide6.QtWidgets import QApplication, QWidget, QPushButton, QVBoxLayout, QLabel

class MyApp(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Mon Application PySide6 Générée")
        self.setGeometry(100, 100, 400, 200)

        layout = QVBoxLayout()

        self.label = QLabel("Bonjour, voici votre application générée par IA !")
        layout.addWidget(self.label)

        button = QPushButton("Cliquez-moi !")
        button.clicked.connect(self.on_button_click)
        layout.addWidget(button)

        self.setLayout(layout)

    def on_button_click(self):
        self.label.setText("Vous avez cliqué ! Prompt initial: 'Crée une application avec un label qui affiche "Bonjour PySide6!" et un bouton qui change le texte du label en "Le bouton a été cliqué!"'")

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = MyApp()
    window.show()
    sys.exit(app.exec())
