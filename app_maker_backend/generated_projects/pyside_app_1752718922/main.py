import sys
from PySide6.QtWidgets import QApplication, QWidget, QPushButton, QVBoxLayout

class MainWindow(QWidget):
    def __init__(self):
        super().__init__()

        self.setWindowTitle("Ma Fenêtre")
        self.setGeometry(100, 100, 400, 400)
        self.setStyleSheet("background-color: lightblue;")

        layout = QVBoxLayout()
        colors = ["red", "green", "blue", "yellow", "orange"]
        for color in colors:
            button = QPushButton(color)
            button.setStyleSheet(f"background-color: {color};")
            layout.addWidget(button)

        self.setLayout(layout)

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())