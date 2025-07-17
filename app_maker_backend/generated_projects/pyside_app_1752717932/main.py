import sys
from PySide6.QtWidgets import QApplication, QWidget, QPushButton, QVBoxLayout, QLineEdit, QMessageBox

class MainWindow(QWidget):
    def __init__(self):
        super().__init__()

        self.setWindowTitle("Application PySide6")
        self.setGeometry(100, 100, 400, 400)

        self.line_edit = QLineEdit()
        self.button = QPushButton("Entrer le texte")
        self.button.clicked.connect(self.show_text)

        layout = QVBoxLayout()
        layout.addWidget(self.line_edit)
        layout.addWidget(self.button)
        self.setLayout(layout)

    def show_text(self):
        text = self.line_edit.text()
        QMessageBox.information(self, "Texte entré", text)

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())