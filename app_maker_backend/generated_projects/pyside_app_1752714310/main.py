import sys
from PySide6.QtWidgets import QApplication, QWidget, QPushButton, QLabel, QVBoxLayout, QTimeEdit, QMessageBox
from PySide6.QtGui import QPalette, QColor
from PySide6.QtCore import QTime

class RamenTimer(QWidget):
    def __init__(self):
        super().__init__()

        self.setWindowTitle("Ramen Timer")
        palette = QPalette()
        palette.setColor(QPalette.Window, QColor(255, 182, 193))
        self.setPalette(palette)

        self.time_edit = QTimeEdit(QTime(0, 3))
        self.start_button = QPushButton("Start")
        self.start_button.clicked.connect(self.start_timer)
        self.label = QLabel("Temps de cuisson restant:")


        layout = QVBoxLayout()
        layout.addWidget(self.label)
        layout.addWidget(self.time_edit)
        layout.addWidget(self.start_button)
        self.setLayout(layout)


    def start_timer(self):
        cook_time = self.time_edit.time()
        if cook_time.isValid():
            QMessageBox.information(self, "Ramen prêt!", "Votre ramen est prêt !")
        else:
            QMessageBox.warning(self, "Erreur", "Veuillez entrer un temps de cuisson valide.")


if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = RamenTimer()
    window.show()
    sys.exit(app.exec())