#!/bin/bash

# 🌳 Git Flow 자동화 스크립트
# 사용법: ./scripts/git-flow.sh [command] [options]

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로고
echo -e "${BLUE}🌳 Git Flow Automation Script${NC}"
echo -e "${BLUE}===============================${NC}\n"

# 함수: 도움말 표시
show_help() {
    echo -e "${YELLOW}사용법:${NC}"
    echo "  ./scripts/git-flow.sh [command] [options]"
    echo ""
    echo -e "${YELLOW}Commands:${NC}"
    echo "  feature <name>     새 기능 브랜치 생성 및 작업"
    echo "  develop           develop 브랜치로 전환 및 업데이트"
    echo "  staging           develop을 Staging 환경에 배포"
    echo "  production        main 브랜치로 전환 및 develop 머지"
    echo "  hotfix <name>     핫픽스 브랜치 생성"
    echo "  status            모든 브랜치 상태 확인"
    echo "  deploy            전체 배포 프로세스 (develop → main)"
    echo ""
    echo -e "${YELLOW}예시:${NC}"
    echo "  ./scripts/git-flow.sh feature user-authentication"
    echo "  ./scripts/git-flow.sh deploy"
    echo "  ./scripts/git-flow.sh hotfix critical-security-fix"
}

# 함수: 브랜치 상태 확인
check_status() {
    echo -e "${BLUE}📊 브랜치 상태 확인${NC}"
    echo "======================================"
    
    # 현재 브랜치
    current_branch=$(git branch --show-current)
    echo -e "현재 브랜치: ${GREEN}$current_branch${NC}"
    
    # 모든 브랜치 나열
    echo -e "\n${YELLOW}로컬 브랜치:${NC}"
    git branch
    
    echo -e "\n${YELLOW}원격 브랜치:${NC}"
    git branch -r
    
    # 각 주요 브랜치의 최신 커밋
    echo -e "\n${YELLOW}최신 커밋:${NC}"
    for branch in main develop; do
        if git show-ref --verify --quiet refs/heads/$branch; then
            last_commit=$(git log --oneline -1 $branch)
            echo -e "$branch: ${GREEN}$last_commit${NC}"
        else
            echo -e "$branch: ${RED}브랜치가 존재하지 않음${NC}"
        fi
    done
}

# 함수: feature 브랜치 생성
create_feature() {
    if [ -z "$1" ]; then
        echo -e "${RED}❌ 기능 이름을 입력해주세요${NC}"
        echo "예시: ./scripts/git-flow.sh feature user-authentication"
        exit 1
    fi
    
    feature_name="feature/$1"
    
    echo -e "${BLUE}🚀 새 기능 브랜치 생성${NC}"
    echo "======================================"
    
    # develop 브랜치로 전환하고 최신 상태로 업데이트
    echo -e "${YELLOW}develop 브랜치로 전환 중...${NC}"
    git checkout develop
    git pull origin develop
    
    # 새 기능 브랜치 생성
    echo -e "${YELLOW}기능 브랜치 생성: $feature_name${NC}"
    git checkout -b $feature_name
    
    echo -e "${GREEN}✅ 기능 브랜치 '$feature_name' 생성 완료${NC}"
    echo -e "${BLUE}이제 개발을 시작할 수 있습니다!${NC}"
}

# 함수: develop 브랜치 작업 (Staging 환경)
work_develop() {
    echo -e "${BLUE}🔧 Staging 환경 배포${NC}"
    echo "======================================"
    
    git checkout develop
    git pull origin develop
    
    echo -e "${YELLOW}변경사항을 커밋하시겠습니까? (y/n)${NC}"
    read -r commit_choice
    
    if [ "$commit_choice" = "y" ] || [ "$commit_choice" = "Y" ]; then
        echo -e "${YELLOW}커밋 메시지를 입력하세요:${NC}"
        read -r commit_message
        
        git add .
        git commit -m "$commit_message"
    fi
    
    git push origin develop
    
    echo -e "${GREEN}✅ Staging 환경에 배포됨${NC}"
    echo -e "${BLUE}🔗 https://yourapp-staging.railway.app${NC}"
}

# 함수: staging 배포 (develop 브랜치 사용)
deploy_staging() {
    echo -e "${BLUE}🧪 Staging 환경 배포${NC}"
    echo "======================================"
    
    # develop 브랜치로 전환하고 최신 상태로 업데이트
    git checkout develop
    git pull origin develop
    
    echo -e "${YELLOW}변경사항을 커밋하시겠습니까? (y/n)${NC}"
    read -r commit_choice
    
    if [ "$commit_choice" = "y" ] || [ "$commit_choice" = "Y" ]; then
        echo -e "${YELLOW}커밋 메시지를 입력하세요:${NC}"
        read -r commit_message
        
        git add .
        git commit -m "$commit_message"
    fi
    
    git push origin develop
    
    echo -e "${GREEN}✅ Staging 환경에 배포됨${NC}"
    echo -e "${BLUE}🔗 https://yourapp-staging.railway.app${NC}"
}

# 함수: production 배포
deploy_production() {
    echo -e "${BLUE}🏭 Production 환경 배포${NC}"
    echo "======================================"
    
    echo -e "${RED}⚠️  프로덕션 배포를 진행하시겠습니까? (y/n)${NC}"
    read -r prod_choice
    
    if [ "$prod_choice" != "y" ] && [ "$prod_choice" != "Y" ]; then
        echo -e "${YELLOW}프로덕션 배포가 취소되었습니다.${NC}"
        exit 0
    fi
    
    # develop의 최신 변경사항 확인
    git checkout develop
    git pull origin develop
    
    # main으로 전환하고 develop 머지
    git checkout main
    git pull origin main
    git merge develop
    
    # 충돌 확인
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ 머지 충돌이 발생했습니다. 수동으로 해결 후 다시 실행해주세요.${NC}"
        exit 1
    fi
    
    # 릴리즈 태그 생성
    echo -e "${YELLOW}릴리즈 태그를 생성하시겠습니까? (y/n)${NC}"
    read -r tag_choice
    
    if [ "$tag_choice" = "y" ] || [ "$tag_choice" = "Y" ]; then
        echo -e "${YELLOW}태그 이름을 입력하세요 (예: v1.0.0):${NC}"
        read -r tag_name
        git tag -a $tag_name -m "Release $tag_name"
        git push origin $tag_name
    fi
    
    git push origin main
    
    echo -e "${GREEN}✅ Production 환경에 배포됨${NC}"
    echo -e "${BLUE}🔗 https://yourapp.railway.app${NC}"
}

# 함수: 전체 배포 프로세스
full_deploy() {
    echo -e "${BLUE}🚀 전체 배포 프로세스 시작${NC}"
    echo "======================================"
    
    echo -e "${YELLOW}1. Staging 환경 확인...${NC}"
    work_develop
    
    echo -e "\n${YELLOW}2. Production 환경 배포 준비...${NC}"
    deploy_production
    
    echo -e "\n${GREEN}🎉 전체 배포 프로세스 완료!${NC}"
}

# 함수: 핫픽스 생성
create_hotfix() {
    if [ -z "$1" ]; then
        echo -e "${RED}❌ 핫픽스 이름을 입력해주세요${NC}"
        echo "예시: ./scripts/git-flow.sh hotfix critical-security-fix"
        exit 1
    fi
    
    hotfix_name="hotfix/$1"
    
    echo -e "${BLUE}🆘 핫픽스 브랜치 생성${NC}"
    echo "======================================"
    
    # main 브랜치에서 핫픽스 브랜치 생성
    git checkout main
    git pull origin main
    git checkout -b $hotfix_name
    
    echo -e "${GREEN}✅ 핫픽스 브랜치 '$hotfix_name' 생성 완료${NC}"
    echo -e "${RED}⚠️  수정 완료 후 모든 브랜치에 머지해야 합니다!${NC}"
}

# 메인 로직
case "$1" in
    "feature")
        create_feature "$2"
        ;;
    "develop")
        work_develop
        ;;
    "staging")
        deploy_staging
        ;;
    "production")
        deploy_production
        ;;
    "deploy")
        full_deploy
        ;;
    "hotfix")
        create_hotfix "$2"
        ;;
    "status")
        check_status
        ;;
    "help"|"-h"|"--help"|"")
        show_help
        ;;
    *)
        echo -e "${RED}❌ 알 수 없는 명령어: $1${NC}"
        show_help
        exit 1
        ;;
esac 