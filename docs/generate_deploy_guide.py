#!/usr/bin/env python3
"""
Generador de la Guía de Despliegue en PDF de AsambleasGiramaster.

Uso:
    python3 docs/generate_deploy_guide.py

Produce docs/GUIA_DESPLIEGUE.pdf a partir del contenido definido en este
mismo script. No incluye ningún valor real de secretos/contraseñas: solo
nombres de variables y estructura (los valores reales viven en los
Secret de k8s y no deben commitearse en un documento distribuible).

Regenerar este PDF cuando cambie el proceso real de despliegue
(docs/DEPLOY.md, .github/workflows/deploy.yml o los manifiestos de k8s/).
"""

import datetime
import io
from pathlib import Path

from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm, mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas as pdfcanvas
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Preformatted,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.graphics.shapes import Drawing, Line, Rect, String

# ────────────────────────────────────────────────────────────────────────
# Rutas y constantes
# ────────────────────────────────────────────────────────────────────────

ROOT = Path(__file__).resolve().parent.parent
COVER_LOGO = ROOT / "backend" / "app" / "static" / "logo_giramaster.jpeg"
ICON_LOGO = ROOT / "frontend" / "src" / "assets" / "Favicon-giramaster.png"
OUTPUT_PATH = Path(__file__).resolve().parent / "GUIA_DESPLIEGUE.pdf"

MESES_ES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
]


def fecha_es(date):
    return f"{date.day} de {MESES_ES[date.month - 1]} de {date.year}"

DOMAIN = "asambleas.giramaster.co"

# Paleta de marca
INDIGO = colors.HexColor("#1E3A8A")
INDIGO_DARK = colors.HexColor("#1f2274")
LIME = colors.HexColor("#8BC53F")
GRAY_TEXT = colors.HexColor("#374151")
GRAY_LIGHT = colors.HexColor("#F3F4F6")
GRAY_BORDER = colors.HexColor("#D1D5DB")
CODE_BG = colors.HexColor("#F9FAFB")
CODE_BORDER = colors.HexColor("#E5E7EB")

PAGE_W, PAGE_H = A4
MARGIN_LR = 50
MARGIN_TOP = 65
MARGIN_BOTTOM = 55

# ────────────────────────────────────────────────────────────────────────
# Estilos
# ────────────────────────────────────────────────────────────────────────

styles = getSampleStyleSheet()

styles.add(
    ParagraphStyle(
        "CoverTitle",
        fontName="Helvetica-Bold",
        fontSize=26,
        leading=32,
        alignment=TA_CENTER,
        textColor=INDIGO,
        spaceBefore=28,
    )
)
styles.add(
    ParagraphStyle(
        "CoverSubtitle",
        fontName="Helvetica",
        fontSize=13,
        leading=18,
        alignment=TA_CENTER,
        textColor=GRAY_TEXT,
        spaceBefore=8,
    )
)
styles.add(
    ParagraphStyle(
        "CoverMeta",
        fontName="Helvetica",
        fontSize=10.5,
        leading=15,
        alignment=TA_CENTER,
        textColor=colors.white,
    )
)
styles.add(
    ParagraphStyle(
        "H1",
        fontName="Helvetica-Bold",
        fontSize=17,
        leading=21,
        textColor=INDIGO,
        spaceBefore=6,
        spaceAfter=10,
        keepWithNext=True,
    )
)
styles.add(
    ParagraphStyle(
        "H2",
        fontName="Helvetica-Bold",
        fontSize=12.5,
        leading=16,
        textColor=INDIGO_DARK,
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True,
    )
)
styles.add(
    ParagraphStyle(
        "Body",
        fontName="Helvetica",
        fontSize=9.7,
        leading=14,
        textColor=GRAY_TEXT,
        alignment=TA_LEFT,
        spaceAfter=6,
    )
)
styles.add(
    ParagraphStyle(
        "BodyBold",
        parent=styles["Body"],
        fontName="Helvetica-Bold",
        textColor=INDIGO_DARK,
    )
)
styles.add(
    ParagraphStyle(
        "DocBullet",
        parent=styles["Body"],
        leftIndent=14,
        bulletIndent=2,
        spaceAfter=3,
    )
)
styles.add(
    ParagraphStyle(
        "DocCode",
        fontName="Courier",
        fontSize=8.3,
        leading=11,
        textColor=colors.HexColor("#111827"),
    )
)
styles.add(
    ParagraphStyle(
        "TableHeader",
        fontName="Helvetica-Bold",
        fontSize=8.6,
        leading=11,
        textColor=colors.white,
        alignment=TA_LEFT,
    )
)
styles.add(
    ParagraphStyle(
        "TableCell",
        fontName="Helvetica",
        fontSize=8.6,
        leading=11,
        textColor=GRAY_TEXT,
        alignment=TA_LEFT,
    )
)
styles.add(
    ParagraphStyle(
        "TableCellMono",
        parent=styles["TableCell"],
        fontName="Courier",
        fontSize=8.0,
    )
)
styles.add(
    ParagraphStyle(
        "Caption",
        fontName="Helvetica-Oblique",
        fontSize=8.3,
        leading=11,
        textColor=colors.HexColor("#6B7280"),
        alignment=TA_CENTER,
        spaceBefore=4,
        spaceAfter=10,
    )
)

# ────────────────────────────────────────────────────────────────────────
# Helpers de contenido
# ────────────────────────────────────────────────────────────────────────

story = []
_section_counter = {"n": 0}
toc_entries = []  # (titulo, nivel) en orden de aparición, para el índice manual


def h1(text):
    _section_counter["n"] += 1
    numbered = f"{_section_counter['n']}. {text}"
    toc_entries.append((numbered, 0))
    story.append(Paragraph(numbered, styles["H1"]))


def h2(text):
    toc_entries.append((text, 1))
    story.append(Paragraph(text, styles["H2"]))


def p(text):
    story.append(Paragraph(text, styles["Body"]))


def bullets(items):
    for item in items:
        story.append(Paragraph(f"•&nbsp;&nbsp;{item}", styles["DocBullet"]))
    story.append(Spacer(1, 4))


def code(text):
    block = Preformatted(text.strip("\n"), styles["DocCode"])
    wrapper = Table([[block]], colWidths=[PAGE_W - 2 * MARGIN_LR])
    wrapper.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), CODE_BG),
                ("BOX", (0, 0), (-1, -1), 0.6, CODE_BORDER),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(wrapper)
    story.append(Spacer(1, 8))


def table(header, rows, col_widths, mono_cols=()):
    data = [[Paragraph(h, styles["TableHeader"]) for h in header]]
    for row in rows:
        cells = []
        for i, cell in enumerate(row):
            style = styles["TableCellMono"] if i in mono_cols else styles["TableCell"]
            cells.append(Paragraph(cell, style))
        data.append(cells)
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), INDIGO),
                ("BACKGROUND", (0, 1), (-1, -1), colors.white),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, GRAY_LIGHT]),
                ("GRID", (0, 0), (-1, -1), 0.5, GRAY_BORDER),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(t)
    story.append(Spacer(1, 10))


def note(text, color=LIME):
    style = ParagraphStyle(
        "Note",
        parent=styles["Body"],
        borderPadding=(6, 8, 6, 8),
        backColor=colors.HexColor("#F0FDF4"),
        borderColor=color,
        borderWidth=0.8,
    )
    story.append(Paragraph(f"<b>Nota:</b> {text}", style))
    story.append(Spacer(1, 8))


def caption(text):
    story.append(Paragraph(text, styles["Caption"]))


# ────────────────────────────────────────────────────────────────────────
# Diagrama de arquitectura (reportlab.graphics.shapes)
# ────────────────────────────────────────────────────────────────────────


def architecture_diagram():
    w, h = PAGE_W - 2 * MARGIN_LR, 240
    d = Drawing(w, h)
    GAP = 26

    def box(x, y, bw, bh, text, fill=colors.white, text_color=INDIGO_DARK, font_size=8.5, sub=None):
        d.add(Rect(x, y, bw, bh, rx=6, ry=6, fillColor=fill, strokeColor=INDIGO, strokeWidth=1))
        d.add(
            String(
                x + bw / 2,
                y + bh / 2 + (5 if sub else 0),
                text,
                fontName="Helvetica-Bold",
                fontSize=font_size,
                fillColor=text_color,
                textAnchor="middle",
            )
        )
        if sub:
            d.add(
                String(
                    x + bw / 2,
                    y + bh / 2 - 9,
                    sub,
                    fontName="Helvetica",
                    fontSize=7,
                    fillColor=text_color,
                    textAnchor="middle",
                )
            )

    def arrow(x1, y1, x2, y2):
        d.add(Line(x1, y1, x2, y2, strokeColor=colors.HexColor("#9CA3AF"), strokeWidth=1.2))

    cx = w / 2

    # Fila 1: Cliente
    client_w, client_h = 170, 32
    client_y = h - client_h
    box(cx - client_w / 2, client_y, client_w, client_h, "Cliente / Navegador", fill=GRAY_LIGHT)

    # Fila 2: Ingress
    ing_w, ing_h = 300, 36
    ing_y = client_y - GAP - ing_h
    box(cx - ing_w / 2, ing_y, ing_w, ing_h, "Ingress (nginx) · TLS", sub=DOMAIN, fill=colors.HexColor("#EEF2FF"))
    arrow(cx, client_y, cx, ing_y + ing_h)

    # Fila 3: Frontend / Backend
    row3_h = 40
    row3_y = ing_y - GAP - row3_h
    fe_w, be_w, gap2 = 200, 220, 20
    total3 = fe_w + gap2 + be_w
    fe_x = cx - total3 / 2
    be_x = fe_x + fe_w + gap2
    box(fe_x, row3_y, fe_w, row3_h, "Frontend", sub="Nginx · puerto 80", fill=colors.HexColor("#ECFDF5"))
    box(be_x, row3_y, be_w, row3_h, "Backend", sub="FastAPI · /api/v1 · :8000", fill=colors.HexColor("#ECFDF5"))
    arrow(fe_x + fe_w / 2, ing_y, fe_x + fe_w / 2, row3_y + row3_h)
    arrow(be_x + be_w / 2, ing_y, be_x + be_w / 2, row3_y + row3_h)

    # Fila 4: Celery Worker / MySQL / Redis — 3 columnas parejas, sin superposición
    row4_h = 38
    row4_y = row3_y - GAP - row4_h
    box_w = 150
    gap3 = (w - 3 * box_w) / 2
    celery_x = 0
    mysql_x = box_w + gap3
    redis_x = 2 * (box_w + gap3)
    box(celery_x, row4_y, box_w, row4_h, "Celery Worker", sub="misma imagen backend", fill=colors.HexColor("#F5F3FF"))
    box(mysql_x, row4_y, box_w, row4_h, "MySQL / MariaDB", sub="PVC 5Gi · :3306", fill=colors.HexColor("#FEF3C7"))
    box(redis_x, row4_y, box_w, row4_h, "Redis", sub="cache/broker · :6379", fill=colors.HexColor("#FEE2E2"))

    be_bottom_cx = be_x + be_w / 2
    for target_x in (celery_x + box_w / 2, mysql_x + box_w / 2, redis_x + box_w / 2):
        arrow(be_bottom_cx, row3_y, target_x, row4_y + row4_h)

    story.append(d)
    caption(
        "Diagrama simplificado del flujo de tráfico y componentes desplegados en el namespace "
        "<font face='Courier'>default</font> del cluster k3s."
    )


# ────────────────────────────────────────────────────────────────────────
# Header / Footer / Portada (callbacks de canvas)
# ────────────────────────────────────────────────────────────────────────

_icon_reader = ImageReader(str(ICON_LOGO)) if ICON_LOGO.exists() else None


def draw_cover(canvas: pdfcanvas.Canvas, doc):
    canvas.saveState()
    # Franja superior
    canvas.setFillColor(INDIGO)
    canvas.rect(0, PAGE_H - 14, PAGE_W, 14, fill=1, stroke=0)
    canvas.setFillColor(LIME)
    canvas.rect(0, PAGE_H - 14, PAGE_W, 3, fill=1, stroke=0)

    # Franja inferior
    footer_h = 50
    canvas.setFillColor(INDIGO)
    canvas.rect(0, 0, PAGE_W, footer_h, fill=1, stroke=0)
    canvas.setFillColor(LIME)
    canvas.rect(0, footer_h, PAGE_W, 3, fill=1, stroke=0)

    canvas.setFillColor(colors.white)
    fecha = fecha_es(datetime.date.today())
    canvas.setFont("Helvetica-Oblique", 9.5)
    canvas.drawCentredString(PAGE_W / 2, footer_h / 2 - 4, fecha)
    canvas.restoreState()


def draw_header_footer(canvas: pdfcanvas.Canvas, doc):
    canvas.saveState()
    # Header: icono + nombre de proyecto
    if _icon_reader is not None:
        icon_size = 16
        canvas.drawImage(
            _icon_reader,
            MARGIN_LR,
            PAGE_H - 42,
            width=icon_size,
            height=icon_size,
            preserveAspectRatio=True,
            mask="auto",
        )
        text_x = MARGIN_LR + icon_size + 6
    else:
        text_x = MARGIN_LR
    canvas.setFont("Helvetica-Bold", 9)
    canvas.setFillColor(INDIGO)
    canvas.drawString(text_x, PAGE_H - 37, "GIRAMASTER")
    canvas.setFont("Helvetica", 8.5)
    canvas.setFillColor(GRAY_TEXT)
    canvas.drawRightString(PAGE_W - MARGIN_LR, PAGE_H - 37, "Guía de Despliegue en Kubernetes")
    canvas.setStrokeColor(GRAY_BORDER)
    canvas.setLineWidth(0.6)
    canvas.line(MARGIN_LR, PAGE_H - 46, PAGE_W - MARGIN_LR, PAGE_H - 46)

    # Footer: línea + número de página
    canvas.line(MARGIN_LR, MARGIN_BOTTOM - 12, PAGE_W - MARGIN_LR, MARGIN_BOTTOM - 12)
    canvas.setFont("Helvetica", 8.5)
    canvas.setFillColor(GRAY_TEXT)
    canvas.drawCentredString(PAGE_W / 2, MARGIN_BOTTOM - 26, f"Página {doc.page}")
    canvas.setFont("Helvetica-Oblique", 7.5)
    canvas.setFillColor(colors.HexColor("#9CA3AF"))
    canvas.drawString(MARGIN_LR, MARGIN_BOTTOM - 26, "AsambleasGiramaster")
    canvas.drawRightString(PAGE_W - MARGIN_LR, MARGIN_BOTTOM - 26, DOMAIN)
    canvas.restoreState()


def _matted_logo(path, threshold=240):
    """Convierte el fondo casi-blanco (#f7f7f7) del JPEG del logo a blanco puro,
    para que no se vea como una caja gris sobre el fondo blanco de la página."""
    im = PILImage.open(path).convert("RGB")
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b = px[x, y]
            if r >= threshold and g >= threshold and b >= threshold:
                px[x, y] = (255, 255, 255)
    buf = io.BytesIO()
    im.save(buf, format="PNG")
    buf.seek(0)
    return buf


# ────────────────────────────────────────────────────────────────────────
# Contenido: PORTADA
# ────────────────────────────────────────────────────────────────────────

def build_cover():
    story.append(Spacer(1, 130))
    if COVER_LOGO.exists():
        logo_w = 320
        logo_h = logo_w * (370 / 948)
        img = Image(_matted_logo(COVER_LOGO), width=logo_w, height=logo_h)
        img.hAlign = "CENTER"
        story.append(img)
    story.append(Spacer(1, 22))
    story.append(Paragraph("Guía de Despliegue en Kubernetes", styles["CoverTitle"]))
    story.append(
        Paragraph(
            "AsambleasGiramaster — Sistema de Administración de Unidades Residenciales "
            "con Reuniones Virtuales Integradas",
            styles["CoverSubtitle"],
        )
    )
    story.append(Spacer(1, 10))
    line_style = ParagraphStyle("line", alignment=TA_CENTER)
    story.append(
        Table(
            [[""]],
            colWidths=[140],
            rowHeights=[2.2],
            style=TableStyle([("BACKGROUND", (0, 0), (-1, -1), LIME)]),
            hAlign="CENTER",
        )
    )
    story.append(NextPageTemplate("Normal"))
    story.append(PageBreak())


# ────────────────────────────────────────────────────────────────────────
# Construcción del contenido completo
# ────────────────────────────────────────────────────────────────────────

def build_content():
    # 1. Arquitectura general
    h1("Arquitectura general")
    p(
        "AsambleasGiramaster se despliega como un conjunto de servicios independientes dentro de un "
        "cluster de Kubernetes (k3s), coordinados por manifiestos de Kustomize ubicados en "
        "<font face='Courier'>k8s/base/</font> y el overlay <font face='Courier'>k8s/overlays/local/</font>. "
        "Todos los recursos viven en el namespace <font face='Courier'>default</font>."
    )
    architecture_diagram()
    story.append(Spacer(1, 6))
    bullets(
        [
            "<b>Ingress (nginx-ingress)</b>: único punto de entrada HTTPS, enruta <font face='Courier'>/</font> al frontend y <font face='Courier'>/api/v1</font> al backend. TLS vía certificado Cloudflare Origin CA.",
            "<b>Frontend</b>: build estático de React servido por Nginx (puerto 80), 2 réplicas.",
            "<b>Backend</b>: API FastAPI (puerto 8000), 2 réplicas.",
            "<b>Celery Worker</b>: misma imagen Docker que el backend, seleccionada vía variable de entorno <font face='Courier'>SERVICE=celery</font>, procesa la cola <font face='Courier'>email_tasks</font>.",
            "<b>MySQL / MariaDB 10.11</b>: 1 réplica con almacenamiento persistente (PVC de 5Gi).",
            "<b>Redis 7</b>: caché de sesiones y broker/result-backend de Celery, sin persistencia.",
        ]
    )

    # 2. Prerrequisitos
    h1("Prerrequisitos")
    p("Antes de desplegar, el nodo/cluster debe contar con:")
    bullets(
        [
            "Un cluster de Kubernetes accesible (k3s en producción).",
            "<font face='Courier'>kubectl</font> configurado y apuntando al cluster (<font face='Courier'>~/.kube/config</font> o <font face='Courier'>KUBECONFIG</font>).",
            "Docker, para construir las imágenes del backend y del frontend.",
            "Un Ingress Controller instalado (se usa <font face='Courier'>nginx-ingress</font>).",
        ]
    )
    h2("Instalar el Ingress Controller")
    code(
        """# Minikube
minikube addons enable ingress

# K3s: ya viene incluido por defecto (Traefik) — si se prefiere nginx:
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/\\
controller-v1.9.4/deploy/static/provider/cloud/deploy.yaml

# Kind
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/\\
main/deploy/static/provider/cloud/deploy.yaml
"""
    )

    # 3. Estructura de manifiestos
    h1("Estructura de los manifiestos")
    p(
        "Los manifiestos se organizan con Kustomize: una capa <font face='Courier'>base/</font> con los "
        "recursos genéricos y un overlay <font face='Courier'>overlays/local/</font> que fija el namespace."
    )
    code(
        """k8s/
|-- base/
|   |-- frontend/
|   |   |-- configmap.yaml     # VITE_API_URL
|   |   |-- deployment.yaml    # imagen giramaster-frontend:latest, 2 replicas
|   |   |-- secret.yaml        # variables sensibles del frontend (si las hay)
|   |   `-- service.yaml       # ClusterIP :80
|   |-- backend/
|   |   |-- configmap.yaml     # HOST_DB, REDIS_HOST, ENVIRONMENT, etc.
|   |   |-- deployment.yaml    # imagen giramaster-backend:latest, 2 replicas
|   |   |-- secret.yaml        # SECRET_KEY, credenciales de BD, FRONTEND_URL...
|   |   `-- service.yaml       # ClusterIP :8000
|   |-- celery/
|   |   `-- deployment.yaml    # misma imagen que backend, SERVICE=celery
|   |-- redis/
|   |   |-- configmap.yaml     # redis.conf (maxmemory, allkeys-lru)
|   |   `-- deployment.yaml    # redis:7-alpine + Service :6379
|   |-- mysql/
|   |   |-- configmap.yaml
|   |   |-- deployment.yaml    # mariadb:10.11, strategy Recreate
|   |   |-- pvc.yaml           # 5Gi ReadWriteOnce
|   |   |-- secret.yaml        # MYSQL_ROOT_PASSWORD, MYSQL_USER, ...
|   |   `-- service.yaml       # ClusterIP :3306
|   |-- ingress.yaml           # host, TLS, reglas /api/v1 y /
|   |-- tls-secret.yaml        # certificado TLS (Cloudflare Origin CA)
|   `-- kustomization.yaml
`-- overlays/
    `-- local/
        `-- kustomization.yaml   # namespace: default
"""
    )

    # 4. Despliegue inicial manual
    h1("Despliegue inicial (manual)")
    p(
        "Para el primer despliegue en un cluster nuevo (o para recrear el entorno desde cero), el flujo "
        "es completamente manual con <font face='Courier'>kubectl</font> + Kustomize."
    )
    h2("4.1 Construir las imágenes")
    code(
        """# Backend (incluye también celery-worker y celery-beat, seleccionados por SERVICE)
docker build -t giramaster-backend:latest ./backend

# Frontend: primero se compila el build de React, luego la imagen Nginx
cd frontend
pnpm install --frozen-lockfile
pnpm build
cd ..
docker build -t giramaster-frontend:latest ./frontend
"""
    )
    note(
        "Los Deployments usan <font face='Courier'>imagePullPolicy: Never</font>: Kubernetes nunca intenta "
        "descargar la imagen de un registry, espera que ya exista en el nodo. Si el cluster tiene varios "
        "nodos, hay que construir (o importar) la imagen en cada uno donde pueda programarse el pod."
    )
    h2("4.2 Aplicar los manifiestos")
    code(
        """# Desde la raíz del proyecto
kubectl apply -k k8s/overlays/local

# Verificar que todo quedó aplicado
kubectl get all -n default
"""
    )
    caption("Ejemplo ilustrativo de la salida esperada (los nombres de pod varían en cada despliegue):")
    code(
        """NAME                                  READY   STATUS    RESTARTS   AGE
pod/backend-6c9b7d4f9c-2xk7q          1/1     Running   0          45s
pod/backend-6c9b7d4f9c-9mvwl          1/1     Running   0          45s
pod/frontend-7f8d9c5b6d-4hqjw         1/1     Running   0          45s
pod/frontend-7f8d9c5b6d-8pzrm         1/1     Running   0          45s
pod/celery-worker-5d8f7c9b6-k2n4t     1/1     Running   0          45s
pod/celery-worker-5d8f7c9b6-t8w3x     1/1     Running   0          45s
pod/mysql-5f6d8c9b7-lq9zv             1/1     Running   0          45s
pod/redis-7b8c9d6f5-w4m2p             1/1     Running   0          45s

NAME                 TYPE        CLUSTER-IP      PORT(S)    AGE
service/backend      ClusterIP   10.43.120.11    8000/TCP   45s
service/frontend     ClusterIP   10.43.88.203    80/TCP     45s
service/mysql        ClusterIP   10.43.55.140    3306/TCP   45s
service/redis        ClusterIP   10.43.201.9     6379/TCP   45s
"""
    )

    # 5. Despliegue automático CI/CD
    h1("Despliegue automático (CI/CD)")
    p(
        "Para el día a día, el despliegue real ocurre a través de un workflow de GitHub Actions "
        "(<font face='Courier'>.github/workflows/deploy.yml</font>) que se dispara automáticamente con "
        "cada <font face='Courier'>push</font> a la rama <font face='Courier'>master</font>, o manualmente "
        "desde la pestaña <i>Actions</i> del repositorio (<font face='Courier'>workflow_dispatch</font>)."
    )
    h2("5.1 Qué hace el workflow, paso a paso")
    p(
        "El workflow se conecta por SSH al servidor de producción y ejecuta 6 pasos, todos dentro de "
        "<font face='Courier'>/srv/proyectos/AsambleasGiramaster</font>:"
    )
    bullets(
        [
            "<b>[1/6] Actualizar código:</b> <font face='Courier'>git fetch origin master &amp;&amp; git reset --hard origin/master</font>.",
            "<b>[2/6] Build frontend:</b> <font face='Courier'>pnpm install --frozen-lockfile &amp;&amp; pnpm build</font> (se puede omitir con el input <font face='Courier'>skip_frontend_build</font>).",
            "<b>[3/6] Build de imágenes Docker:</b> <font face='Courier'>docker build --no-cache</font> para <font face='Courier'>giramaster-backend</font> y <font face='Courier'>giramaster-frontend</font>, ambas etiquetadas también con el SHA corto del commit.",
            "<b>[4/6] Importar a k3s:</b> <font face='Courier'>docker save ... | sudo k3s ctr images import -</font> — no se usa ningún registry externo, la imagen se inyecta directo al containerd del nodo.",
            "<b>[5/6] Rollout restart:</b> reinicia <font face='Courier'>backend</font>, <font face='Courier'>frontend</font> y <font face='Courier'>celery-worker</font>.",
            "<b>[6/6] Verificación:</b> <font face='Courier'>kubectl rollout status</font> de los 3 Deployments con timeout de 120s, y resumen final con el estado de los pods.",
        ]
    )
    caption("Salida real que imprime el workflow en cada corrida (recortada):")
    code(
        """==========================================
  GIRAMASTER - Deploy 2026-07-29 20:10:03
==========================================

[1/6] Actualizando código desde master...
✓ Código actualizado → a1b2c3d fix: ...

[2/6] Compilando frontend...
✓ Frontend compilado (dist/)

[3/6] Construyendo imágenes Docker...
  → Backend...
  ✓ giramaster-backend:latest
  → Frontend...
  ✓ giramaster-frontend:latest

[4/6] Importando imágenes a k3s...
  → Importando backend...
  ✓ Backend importado
  → Importando frontend...
  ✓ Frontend importado

[5/6] Reiniciando deployments...
  ✓ Restart solicitado a los 3 deployments

[6/6] Esperando que los pods estén Ready...
  ✓ backend OK
  ✓ frontend OK
  ✓ celery-worker OK

==========================================
  ✓ Deploy exitoso
=========================================="""
    )
    h2("5.2 Disparar el workflow manualmente")
    p(
        "Desde GitHub → pestaña <i>Actions</i> → workflow <i>Deploy to Production</i> → "
        "<i>Run workflow</i>. Permite marcar <font face='Courier'>skip_frontend_build: true</font> "
        "cuando solo cambió el backend, para ahorrar tiempo de build."
    )

    # 6. DNS y TLS
    h1("Configuración de DNS y TLS")
    h2("6.1 Obtener la IP del Ingress")
    code(
        """kubectl get ingress main-ingress -n default \\
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
"""
    )
    h2(f"6.2 Configurar el dominio ({DOMAIN})")
    bullets(
        [
            "En el proveedor DNS (Cloudflare), crear/editar un registro <b>A</b> apuntando a la IP del Ingress.",
            f"<b>Name</b>: subdominio correspondiente a <font face='Courier'>{DOMAIN}</font>.",
            "<b>Proxy status</b>: activado (orange cloud), si se usa Cloudflare como proxy/CDN.",
        ]
    )
    note(
        f"El host configurado en <font face='Courier'>k8s/base/ingress.yaml</font> y en "
        f"<font face='Courier'>k8s/base/tls-secret.yaml</font> debe coincidir exactamente con el dominio "
        f"real (<font face='Courier'>{DOMAIN}</font>) y con el certificado TLS emitido para ese dominio."
    )
    h2("6.3 Verificar el certificado SSL")
    code(
        f"""curl -vI https://{DOMAIN}/

openssl s_client -connect {DOMAIN}:443 -servername {DOMAIN}
"""
    )

    # 7. Verificación post-despliegue
    h1("Verificación post-despliegue")
    table(
        ["Servicio", "URL"],
        [
            ["Frontend", f"https://{DOMAIN}/"],
            ["Backend API", f"https://{DOMAIN}/api/v1/"],
            ["Health (frontend)", f"https://{DOMAIN}/health"],
        ],
        col_widths=[140, 340],
    )
    h2("Health checks por componente")
    code(
        f"""# MySQL / MariaDB
kubectl get pods -l app=mysql
kubectl exec -it <mysql-pod> -- mysqladmin ping

# Backend
curl https://{DOMAIN}/api/v1/

# Frontend
curl https://{DOMAIN}/health
"""
    )

    # 8. Logs
    h1("Logs y monitoreo")
    code(
        """kubectl logs -l app=frontend -f
kubectl logs -l app=backend -f
kubectl logs -l app=celery-worker -f
kubectl logs -l app=mysql -f
kubectl logs -l app=redis -f

# Eventos recientes del cluster
kubectl get events --sort-by='.lastTimestamp'
"""
    )

    # 9. Escalado
    h1("Escalado")
    code(
        """kubectl scale deployment frontend       --replicas=3
kubectl scale deployment backend        --replicas=2
kubectl scale deployment celery-worker  --replicas=4
"""
    )

    # 10. Actualizaciones
    h1("Actualizaciones")
    h2("Camino recomendado: push a master")
    p("Basta con fusionar los cambios a <font face='Courier'>master</font>; el CI/CD hace el resto (sección 5).")
    h2("Camino manual (si se necesita fuera del pipeline)")
    code(
        """# Backend (también reinicia celery-worker, comparte imagen)
docker build -t giramaster-backend:latest ./backend
kubectl rollout restart deployment/backend
kubectl rollout restart deployment/celery-worker
kubectl rollout status deployment/backend
kubectl rollout status deployment/celery-worker

# Frontend
cd frontend && pnpm build && cd ..
docker build -t giramaster-frontend:latest ./frontend
kubectl rollout restart deployment/frontend
"""
    )

    # 11. Rollback
    h1("Rollback")
    code(
        """kubectl rollout history deployment/backend
kubectl rollout undo deployment/backend
kubectl rollout undo deployment/backend --to-revision=2
"""
    )

    # 12. Celery
    h1("Celery (workers)")
    code(
        """# Ver pods y logs
kubectl get pods -l app=celery-worker
kubectl logs -l app=celery-worker -f

# Estado de la cola
kubectl exec -it <celery-pod> -- celery -A app.celery_app inspect active
kubectl exec -it <celery-pod> -- celery -A app.celery_app inspect ping
kubectl exec -it <celery-pod> -- celery -A app.celery_app inspect scheduled
kubectl exec -it <celery-pod> -- celery -A app.celery_app inspect reserved

# Escalar workers
kubectl scale deployment celery-worker --replicas=4
"""
    )

    # 13. Troubleshooting
    h1("Troubleshooting común")
    h2("El Ingress no obtiene IP externa")
    code(
        """kubectl describe ingress main-ingress
kubectl get svc -n ingress-nginx
"""
    )
    h2("El SSL no funciona")
    code(
        """kubectl describe secret tls-secret
kubectl describe ingress main-ingress
"""
    )
    h2("Un pod no inicia")
    code(
        """kubectl logs <pod-name>
kubectl describe pod <pod-name>
"""
    )

    # 14. Limpieza
    h1("Limpieza / desinstalación")
    code(
        """# Eliminar todos los recursos del overlay
kubectl delete -k k8s/overlays/local

# Eliminar el PVC (¡CUIDADO! Borra los datos de MySQL)
kubectl delete pvc mysql-pvc

# Eliminar imágenes locales (opcional)
docker rmi giramaster-backend:latest giramaster-frontend:latest
"""
    )

    # 15. Variables de entorno (solo estructura, sin valores reales)
    h1("Variables de entorno y secretos")
    note(
        "Esta sección documenta únicamente <b>nombres y propósito</b> de las variables. Los valores reales "
        "viven en los Secret de Kubernetes (<font face='Courier'>k8s/base/*/secret.yaml</font>) y no se "
        "incluyen en este documento por seguridad."
    )
    h2("Backend — ConfigMap (backend-config)")
    table(
        ["Variable", "Descripción"],
        [
            ["ENVIRONMENT", "development / production."],
            ["HOST, PORT", "Bind de Uvicorn dentro del contenedor."],
            ["HOST_DB, PORT_DB, NAME_DB", "Conexión a MySQL/MariaDB (host = Service &quot;mysql&quot;)."],
            ["REDIS_HOST, REDIS_PORT", "Conexión a Redis (host = Service &quot;redis&quot;)."],
        ],
        col_widths=[160, 320],
        mono_cols=(0,),
    )
    h2("Backend — Secret (backend-secret)")
    table(
        ["Variable", "Descripción"],
        [
            ["SECRET_KEY, REFRESH_SECRET_KEY", "Firma de los JWT de sesión y de auto-login/QR."],
            ["ENCRYPTION_MASTER_KEY", "Cifra credenciales sensibles guardadas en BD (ej. integraciones)."],
            ["USER_DB, PASSWORD_DB", "Credenciales de la base de datos."],
            ["FRONTEND_URL", "Base usada para construir los links de auto-login/QR en emails."],
            ["REDIS_URL, CELERY_RESULT_BACKEND", "URL de conexión a Redis para Celery."],
        ],
        col_widths=[160, 320],
        mono_cols=(0,),
    )
    h2("Frontend — ConfigMap (frontend-config)")
    table(
        ["Variable", "Descripción"],
        [["VITE_API_URL", "Prefijo de la API consumida por el SPA (por defecto &quot;/api/v1&quot;)."]],
        col_widths=[160, 320],
        mono_cols=(0,),
    )
    h2("MySQL — Secret (mysql-secret)")
    table(
        ["Variable", "Descripción"],
        [
            ["MYSQL_ROOT_PASSWORD", "Password del usuario root del contenedor MariaDB."],
            ["MYSQL_USER, MYSQL_PASSWORD", "Credenciales de la aplicación."],
            ["MYSQL_DATABASE", "Nombre de la base de datos creada al iniciar el contenedor."],
        ],
        col_widths=[160, 320],
        mono_cols=(0,),
    )

    # 16. Recursos por componente
    h1("Configuración de recursos por componente")
    table(
        ["Componente", "Réplicas", "Requests → Limits"],
        [
            ["Frontend", "2", "64Mi / 100m → 128Mi / 200m"],
            ["Backend", "2", "256Mi / 250m → 512Mi / 500m"],
            ["Celery Worker", "2", "256Mi / 250m → 512Mi / 500m"],
            ["MySQL / MariaDB", "1", "— (ver deployment.yaml)"],
            ["Redis", "1", "— (ver deployment.yaml)"],
        ],
        col_widths=[160, 90, 230],
    )


# ────────────────────────────────────────────────────────────────────────
# Índice real (se construye al final, con los títulos ya recolectados)
# ────────────────────────────────────────────────────────────────────────

def build_index():
    idx_story = []
    idx_story.append(Paragraph("Índice", styles["H1"]))
    idx_story.append(Spacer(1, 6))
    for title, level in toc_entries:
        style_name = "BodyBold" if level == 0 else "Body"
        indent = 0 if level == 0 else 14
        st = ParagraphStyle(
            f"idx_{level}_{title[:8]}",
            parent=styles[style_name],
            leftIndent=indent,
            spaceAfter=4 if level == 0 else 2,
        )
        idx_story.append(Paragraph(title, st))
    idx_story.append(PageBreak())
    return idx_story


# ────────────────────────────────────────────────────────────────────────
# Main
# ────────────────────────────────────────────────────────────────────────

def main():
    build_cover()
    build_content()

    # Reconstruimos: portada ya está al inicio de `story` (build_cover corrió primero),
    # luego insertamos el índice recién armado, y después el resto del contenido.
    cover_end = story.index(next(f for f in story if isinstance(f, PageBreak)))
    cover_flowables = story[: cover_end + 1]
    rest_flowables = story[cover_end + 1 :]

    final_story = cover_flowables + build_index() + rest_flowables

    doc = BaseDocTemplate(
        str(OUTPUT_PATH),
        pagesize=A4,
        title="Guía de Despliegue en Kubernetes — AsambleasGiramaster",
    )
    cover_frame = Frame(0, 0, PAGE_W, PAGE_H, id="cover", leftPadding=40, rightPadding=40, topPadding=0, bottomPadding=0)
    normal_frame = Frame(
        MARGIN_LR,
        MARGIN_BOTTOM,
        PAGE_W - 2 * MARGIN_LR,
        PAGE_H - MARGIN_TOP - MARGIN_BOTTOM,
        id="normal",
    )
    doc.addPageTemplates(
        [
            PageTemplate(id="Cover", frames=[cover_frame], onPage=draw_cover),
            PageTemplate(id="Normal", frames=[normal_frame], onPage=draw_header_footer),
        ]
    )

    doc.build(final_story)
    print(f"PDF generado: {OUTPUT_PATH} ({OUTPUT_PATH.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
