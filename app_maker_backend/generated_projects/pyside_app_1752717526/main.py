import sys
from PySide6.QtWidgets import QApplication, QWidget, QPushButton, QLabel, QLineEdit, QVBoxLayout

class MainWindow(QWidget):
    def __init__(self):
        super().__init__()

        self.setWindowTitle("Simple App")
        self.setGeometry(100, 100, 400, 400)

        layout = QVBoxLayout()

        button1 = QPushButton("Button 1")
        button2 = QPushButton("Button 2")
        label1 = QLabel("Label 1")
        text_input1 = QLineEdit()
        label2 = QLabel("Label 2")
        text_input2 = QLineEdit()

        layout.addWidget(button1)
        layout.addWidget(button2)
        layout.addWidget(label1)
        layout.addWidget(text_input1)
        layout.addWidget(label2)
        layout.addWidget(text_input2)

        self.setLayout(layout)


def main():
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())

if __name__ == "__main__":
    main()